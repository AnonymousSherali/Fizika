import pytest
from django.core import mail
from django.core.cache import cache

from apps.accounts.models import LoginEvent, User

from .conftest import PASSWORD

pytestmark = pytest.mark.django_db


def test_teacher_register_verify_login(api, school, codes):
    r = api.post("/api/v1/auth/register/teacher/", {
        "first_name": "Dilnoza", "last_name": "Karimova", "phone": "90 123-45-67",
        "password": PASSWORD, "school_id": school.id}, format="json")
    assert r.status_code == 201, r.data
    assert r.data["verification"]["channel"] == "sms"
    assert r.data["verification"]["target"] == "+998*****4567"
    user = User.objects.get(phone="+998901234567")
    assert user.role == "teacher" and not user.is_verified

    # Tasdiqlanmagan o'qituvchi kira olmaydi
    r = api.post("/api/v1/auth/login/", {"login": "+998901234567", "password": PASSWORD}, format="json")
    assert r.status_code == 401
    assert r.data["error"]["code"] == "not_verified"

    r = api.post("/api/v1/auth/verify/", {"login": "901234567", "code": "000000"}, format="json")
    assert r.status_code == 400
    r = api.post("/api/v1/auth/verify/", {"login": "901234567", "code": codes[-1]}, format="json")
    assert r.status_code == 200 and r.data["access"]

    r = api.post("/api/v1/auth/login/", {"login": "998 90 123 45 67", "password": PASSWORD}, format="json")
    assert r.status_code == 200
    assert r.data["user"]["is_verified"] is True


def test_teacher_register_with_new_school_and_email(api, codes):
    r = api.post("/api/v1/auth/register/teacher/", {
        "first_name": "Aziz", "last_name": "Rahimov", "email": "Aziz@Mail.UZ", "password": PASSWORD,
        "new_school": {"name": "5-maktab", "region": "samarqand", "district": "Urgut"}}, format="json")
    assert r.status_code == 201, r.data
    assert r.data["verification"]["channel"] == "email"
    assert len(mail.outbox) == 1 and codes[-1] in mail.outbox[0].body
    assert User.objects.get(email="aziz@mail.uz").school.name == "5-maktab"


def test_teacher_register_validation(api, teacher):
    r = api.post("/api/v1/auth/register/teacher/", {
        "first_name": "A", "last_name": "B", "phone": "+998901112233", "password": "123"}, format="json")
    assert r.status_code == 400
    f = r.data["error"]["fields"]
    assert "phone" in f and "password" in f


def test_student_register_with_join_code(api, classroom):
    r = api.post("/api/v1/auth/register/student/", {
        "join_code": classroom.join_code.lower(), "first_name": "Vali", "last_name": "Aliyev",
        "username": "Vali.Aliyev", "password": PASSWORD}, format="json")
    assert r.status_code == 201, r.data
    assert r.data["user"]["role"] == "student" and r.data["user"]["username"] == "vali.aliyev"
    assert classroom.memberships.filter(user__username="vali.aliyev").exists()


def test_student_register_bad_code(api, classroom):
    classroom.join_code = None
    classroom.save()
    r = api.post("/api/v1/auth/register/student/", {
        "join_code": "FZ-XXXX", "first_name": "A", "last_name": "B", "username": "abc", "password": PASSWORD},
        format="json")
    assert r.status_code == 400 and "join_code" in r.data["error"]["fields"]


def test_login_lockout_after_failures(api, student, settings):
    cache.clear()
    for _ in range(settings.LOGIN_MAX_FAILURES):
        r = api.post("/api/v1/auth/login/", {"login": "aliyev.vali", "password": "xato"}, format="json")
        assert r.status_code == 401
    # To'g'ri parol bilan ham bloklangan
    r = api.post("/api/v1/auth/login/", {"login": "aliyev.vali", "password": PASSWORD}, format="json")
    assert r.status_code == 401 and r.data["error"]["code"] == "locked"
    assert LoginEvent.objects.filter(user=student, success=False).count() == settings.LOGIN_MAX_FAILURES
    cache.clear()


def test_logout_blacklists_refresh(api, student):
    r = api.post("/api/v1/auth/login/", {"login": "ALIYEV.VALI", "password": PASSWORD}, format="json")
    access, refresh = r.data["access"], r.data["refresh"]
    api.credentials(HTTP_AUTHORIZATION="Bearer " + access)
    assert api.post("/api/v1/auth/logout/", {"refresh": refresh}, format="json").status_code == 204
    api.credentials()
    r = api.post("/api/v1/auth/refresh/", {"refresh": refresh}, format="json")
    assert r.status_code == 401


def test_refresh_rotation(api, student):
    r = api.post("/api/v1/auth/login/", {"login": "aliyev.vali", "password": PASSWORD}, format="json")
    r2 = api.post("/api/v1/auth/refresh/", {"refresh": r.data["refresh"]}, format="json")
    assert r2.status_code == 200 and r2.data["refresh"] != r.data["refresh"]
    # Eski refresh qayta ishlatilmaydi
    assert api.post("/api/v1/auth/refresh/", {"refresh": r.data["refresh"]}, format="json").status_code == 401


def test_password_reset_flow(api, teacher, codes):
    r = api.post("/api/v1/auth/password/reset/", {"login": "+998901112233"}, format="json")
    assert r.status_code == 200 and codes
    r = api.post("/api/v1/auth/password/reset/confirm/", {
        "login": "901112233", "code": codes[-1], "new_password": "Yangi-parol-77"}, format="json")
    assert r.status_code == 200, r.data
    assert api.post("/api/v1/auth/login/", {"login": "+998901112233", "password": "Yangi-parol-77"},
                    format="json").status_code == 200
    # Kod ikkinchi marta ishlamaydi
    r = api.post("/api/v1/auth/password/reset/confirm/", {
        "login": "901112233", "code": codes[-1], "new_password": "Yana-boshqa-88"}, format="json")
    assert r.status_code == 400


def test_password_reset_unknown_login_does_not_leak(api):
    r = api.post("/api/v1/auth/password/reset/", {"login": "yoq-odam"}, format="json")
    assert r.status_code == 200


def test_code_attempts_limited(api, teacher, codes, settings):
    api.post("/api/v1/auth/password/reset/", {"login": "+998901112233"}, format="json")
    for _ in range(settings.VERIFICATION_CODE_MAX_ATTEMPTS):
        api.post("/api/v1/auth/password/reset/confirm/", {
            "login": "901112233", "code": "111111", "new_password": "Yangi-parol-77"}, format="json")
    r = api.post("/api/v1/auth/password/reset/confirm/", {
        "login": "901112233", "code": codes[-1], "new_password": "Yangi-parol-77"}, format="json")
    assert r.status_code == 400


def test_me_get_patch_and_logins(api, auth, student):
    api.post("/api/v1/auth/login/", {"login": "aliyev.vali", "password": PASSWORD}, format="json")
    auth(api, student)
    r = api.get("/api/v1/me/")
    assert r.status_code == 200 and r.data["username"] == "aliyev.vali"
    r = api.patch("/api/v1/me/", {"language": "ru", "theme": "dark", "role": "admin"}, format="json")
    assert r.status_code == 200
    assert r.data["language"] == "ru" and r.data["theme"] == "dark" and r.data["role"] == "student"
    r = api.get("/api/v1/me/logins/")
    assert r.status_code == 200 and r.data[0]["success"] is True


def test_password_change(api, auth, student):
    auth(api, student)
    r = api.post("/api/v1/auth/password/change/", {"old_password": "xato", "new_password": "Yangi-parol-77"},
                 format="json")
    assert r.status_code == 400
    r = api.post("/api/v1/auth/password/change/", {"old_password": PASSWORD, "new_password": "Yangi-parol-77"},
                 format="json")
    assert r.status_code == 200
    student.refresh_from_db()
    assert student.check_password("Yangi-parol-77")


def test_me_delete_and_purge(api, auth, student):
    from datetime import timedelta

    from django.utils import timezone

    from apps.accounts.tasks import purge_deleted_accounts

    auth(api, student)
    assert api.delete("/api/v1/me/").status_code == 202
    student.refresh_from_db()
    assert not student.is_active and student.deletion_requested_at
    assert api.post("/api/v1/auth/login/", {"login": "aliyev.vali", "password": PASSWORD},
                    format="json").status_code == 401
    assert purge_deleted_accounts() == 0  # hali 30 kun o'tmagan
    User.objects.filter(pk=student.pk).update(deletion_requested_at=timezone.now() - timedelta(days=31))
    assert purge_deleted_accounts() == 1
    assert not User.objects.filter(pk=student.pk).exists()


def test_error_format_unauthenticated(api):
    r = api.get("/api/v1/me/")
    assert r.status_code == 401
    assert set(r.data["error"]) >= {"code", "message"}


def test_russian_error_language(api):
    r = api.get("/api/v1/me/", HTTP_ACCEPT_LANGUAGE="ru")
    assert r.status_code == 401

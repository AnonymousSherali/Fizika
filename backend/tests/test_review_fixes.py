"""
Ishga tushirishdan oldingi ko'rib chiqishda topilgan xatolar uchun regressiya testlari
(admin paneldagi buzilgan ma'lumot, ruxsatlar, ball hisoblash, xavfsizlik).
"""

from datetime import timedelta

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, override_settings
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.analytics.exports import cell
from apps.assignments.models import Assignment, Submission
from apps.core.net import client_ip
from apps.labs.models import LabJournal
from apps.quizzes.models import Attempt, Problem, Question, Status, Topic
from apps.schools.models import Classroom, ClassroomMember, generate_join_code

from .conftest import PASSWORD, make_user
from .test_assignments import lab_payload, pendulum_journal, test_payload

pytestmark = pytest.mark.django_db


# ---------- Admin panelda buzilgan savol/masala ----------
def test_question_clean_rejects_malformed():
    t = Topic.objects.get(key="kepler")
    for options, idx in [([{"uz": "a"}, {"uz": "b"}], 0), ({"a": 1}, 0),
                         ([{"uz": "a"}, {"uz": "b"}, {"uz": "c"}, {"uz": "d"}], 7),
                         ([{"uz": "a"}, {"uz": "a"}, {"uz": "c"}, {"uz": "d"}], 0)]:
        with pytest.raises(ValidationError):
            Question(topic=t, text_uz="?", options=options, correct_index=idx).full_clean()


def test_problem_clean_rejects_bad_params():
    t = Topic.objects.get(key="kepler")
    for params, formula in [({"U": [1]}, "U"), ({"U": [1, 5, 0]}, "U"), ({"U": [1, 5, 1]}, "U*"),
                            ({"U": [1, 5, 1]}, "")]:
        with pytest.raises(ValidationError):
            Problem(topic=t, text_uz="U = {U}", answer=1, params=params, formula=formula).full_clean()


def test_broken_rows_in_db_do_not_break_practice_or_tests(api, auth, student):
    t = Topic.objects.get(key="kepler")
    # admin panel validatsiyasini chetlab yozilgan (masalan, eski versiyadan qolgan) yozuvlar
    Question.objects.create(topic=t, text_uz="BUZUQ1", options=[{"uz": "a"}], correct_index=0, status=Status.APPROVED)
    Question.objects.create(topic=t, text_uz="BUZUQ2", options={"x": 1}, correct_index=0, status=Status.APPROVED)
    Problem.objects.create(topic=t, text_uz="BUZUQ3 {U}", answer=1, params={"U": [1]}, formula="U*",
                           status=Status.APPROVED)
    r = api.get("/api/v1/quiz/bank/")
    assert r.status_code == 200
    texts = [q["q"] for q in r.data["questions"]] + [p["q"] for p in r.data["problems"]]
    assert not any(x.startswith("BUZUQ") for x in texts)
    assert api.get("/api/v1/quiz/practice/?topics=kepler&count=200").status_code == 200
    auth(api, student)
    r = api.post("/api/v1/quiz/attempts/", {"topics": ["kepler"], "count": 200, "problems": 20}, format="json")
    assert r.status_code == 201 and not any("BUZUQ" in it["text"] for it in r.data["items"])


# ---------- Topshiriq sozlamasi ----------
def test_partial_quiz_config_patch_is_merged(api, auth, teacher, classroom):
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", test_payload(classroom), format="json").data["id"]
    r = api.patch(f"/api/v1/assignments/{aid}/", {"quiz_config": {"count": 5}}, format="json")
    assert r.status_code == 200, r.data
    assert r.data["quiz_config"]["topics"] == ["kepler"] and r.data["quiz_config"]["count"] == 5
    assert api.get("/api/v1/assignments/").status_code == 200


def test_assignment_clean_for_admin(teacher, classroom):
    a = Assignment(teacher=teacher, type="test", title="x", quiz_config={"count": 5})
    with pytest.raises(ValidationError):
        a.full_clean()
    a = Assignment(teacher=teacher, type="lab", title="x", max_attempts=1)
    with pytest.raises(ValidationError):
        a.full_clean()


def test_teacher_deletion_keeps_student_grades(api, auth, teacher, student, classroom):
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", lab_payload(classroom), format="json").data["id"]
    Submission.objects.create(assignment_id=aid, student=student, status="graded", grade=5)
    teacher.delete()
    a = Assignment.objects.get(pk=aid)
    assert a.teacher is None and Submission.objects.filter(assignment=a, grade=5).exists()
    auth(api, student)
    assert api.get("/api/v1/assignments/").status_code == 200


# ---------- Ball va muddat ----------
def _finished(user, a, percent, finished_at):
    return Attempt.objects.create(user=user, assignment=a, percent=percent, score=percent, max_score=100,
                                  finished_at=finished_at, config={})


def test_late_retry_does_not_penalize_on_time_best(teacher, student, classroom):
    from apps.assignments.services import on_attempt_finished

    now = timezone.now()
    a = Assignment.objects.create(teacher=teacher, type="test", title="t", grading_scale=100, max_attempts=2,
                                  quiz_config={"topics": ["kepler"], "count": 1, "problems": 0},
                                  due_at=now - timedelta(hours=1), allow_late=True, late_penalty_pct=50)
    a.classrooms.add(classroom)
    on_attempt_finished(_finished(student, a, 100, now - timedelta(hours=2)))   # o'z vaqtida
    on_attempt_finished(_finished(student, a, 0, now))                          # kech, yomon
    sub = Submission.objects.get(assignment=a, student=student)
    assert sub.grade == 100 and sub.is_late is False


def test_attempt_deadline_capped_at_due_when_late_not_allowed(api, auth, teacher, student, classroom):
    auth(api, teacher)
    due = timezone.now() + timedelta(minutes=5)
    aid = api.post("/api/v1/assignments/", test_payload(classroom, due_at=due.isoformat()), format="json").data["id"]
    auth(api, student)
    r = api.post("/api/v1/quiz/attempts/", {"assignment_id": aid}, format="json")
    assert r.status_code == 201, r.data
    att = Attempt.objects.get(pk=r.data["id"])
    assert att.deadline_at <= due + timedelta(seconds=1)   # 20 daqiqalik chegara muddat bilan cheklandi


# ---------- Ruxsatlar ----------
def test_co_teacher_sees_only_own_class_students(api, auth, teacher, other_teacher, student, classroom, school):
    other_class = Classroom.objects.create(name="11-B", grade=11, school=school, created_by=other_teacher)
    ClassroomMember.objects.create(classroom=other_class, user=other_teacher, role=ClassroomMember.Role.TEACHER)
    ClassroomMember.objects.create(classroom=classroom, user=other_teacher, role=ClassroomMember.Role.ASSISTANT)
    # teacher 10-A va 11-B? Yo'q: muallif — other_teacher, topshiriq ikkala sinfga
    auth(api, other_teacher)
    aid = api.post("/api/v1/assignments/", lab_payload(classroom, classrooms=[classroom.id, other_class.id]),
                   format="json").data["id"]
    stranger = make_user(Role.STUDENT, school, username="begona.oquvchi")
    ClassroomMember.objects.create(classroom=other_class, user=stranger)
    sub = Submission.objects.create(assignment_id=aid, student=stranger, status="submitted")
    # 10-A asosiy o'qituvchisi (teacher) 11-B o'quvchisini ko'rmaydi va baholay olmaydi
    auth(api, teacher)
    names = [r["student"]["name"] for r in api.get(f"/api/v1/assignments/{aid}/submissions/").data]
    assert all("begona" not in n.lower() for n in names) and any("Aliyev" in n for n in names)
    assert api.get(f"/api/v1/submissions/{sub.id}/").status_code == 404
    assert api.post(f"/api/v1/submissions/{sub.id}/grade/", {"grade": 5}, format="json").status_code == 404


def test_assistant_cannot_manage_teachers(api, auth, teacher, other_teacher, classroom):
    ClassroomMember.objects.create(classroom=classroom, user=other_teacher, role=ClassroomMember.Role.ASSISTANT)
    auth(api, other_teacher)
    assert api.delete(f"/api/v1/classrooms/{classroom.id}/teachers/{teacher.id}/").status_code == 403
    assert classroom.memberships.filter(user=teacher).exists()


def test_student_card_is_only_for_students(api, auth, teacher, other_teacher, classroom):
    ClassroomMember.objects.create(classroom=classroom, user=other_teacher, role=ClassroomMember.Role.ASSISTANT)
    auth(api, teacher)
    assert api.get(f"/api/v1/analytics/students/{other_teacher.id}/").status_code == 403


def test_private_submission_image(api, auth, teacher, other_teacher, student, classroom):
    import base64

    png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", lab_payload(classroom, require_conclusion=False, require_graph=False),
                   format="json").data["id"]
    auth(api, student)
    jid = pendulum_journal(api)
    r = api.post(f"/api/v1/assignments/{aid}/submit/", {"lab_journal_id": jid,
                                                        "image": SimpleUploadedFile("g.png", png, "image/png")},
                 format="multipart")
    assert r.status_code == 200, r.data
    sub = Submission.objects.get(assignment_id=aid, student=student)
    assert sub.image.name.startswith("private/submissions/") and r.data["image"].endswith("/image/")
    assert api.get(f"/api/v1/submissions/{sub.id}/image/").status_code == 200
    auth(api, teacher)
    assert api.get(f"/api/v1/submissions/{sub.id}/image/").status_code == 200
    auth(api, other_teacher)
    assert api.get(f"/api/v1/submissions/{sub.id}/image/").status_code == 404
    api.credentials()
    assert api.get(f"/api/v1/submissions/{sub.id}/image/").status_code == 401
    path = sub.image.path
    sub.delete()
    import os
    assert not os.path.exists(path)   # fayl ham o'chirildi


# ---------- Hisoblar va xavfsizlik ----------
def test_lockout_counts_all_spellings_of_phone(api, teacher):
    for i in range(10):
        login = ["+998901112233", "901112233", "90 111 22 33", "(90)1112233"][i % 4]
        api.post("/api/v1/auth/login/", {"login": login, "password": "xato"}, format="json")
    r = api.post("/api/v1/auth/login/", {"login": "998901112233", "password": PASSWORD}, format="json")
    assert r.status_code == 401 and r.data["error"]["code"] == "locked"


@override_settings(REST_FRAMEWORK={"NUM_PROXIES": 1})
def test_client_ip_ignores_spoofed_forwarded_for():
    req = RequestFactory().get("/", HTTP_X_FORWARDED_FOR="6.6.6.6, 10.0.0.7", REMOTE_ADDR="127.0.0.1")
    assert client_ip(req) == "10.0.0.7"


def test_client_ip_without_proxy_uses_remote_addr():
    req = RequestFactory().get("/", HTTP_X_FORWARDED_FOR="6.6.6.6", REMOTE_ADDR="10.1.1.1")
    assert client_ip(req) == "10.1.1.1"


def test_digit_only_student_login_rejected_and_teacher_username_collision(api, classroom, codes, school):
    r = api.post("/api/v1/auth/register/student/", {
        "join_code": classroom.join_code, "first_name": "A", "last_name": "B", "username": "998905554433",
        "password": PASSWORD, "accept_privacy": True}, format="json")
    assert r.status_code == 400 and "username" in r.data["error"]["fields"]
    User.objects.create(username="998905554433", role=Role.STUDENT)   # eski yozuv
    r = api.post("/api/v1/auth/register/teacher/", {
        "first_name": "O", "last_name": "Q", "phone": "+998905554433", "school_id": school.id, "password": PASSWORD,
        "accept_privacy": True}, format="json")
    assert r.status_code == 201, r.data
    assert User.objects.get(phone="+998905554433").username == "998905554433_2"


def test_join_code_is_long():
    assert len(generate_join_code()) == len("FZ-") + 6


def test_spreadsheet_formula_injection_guard():
    assert cell("=HYPERLINK(\"http://x\")").startswith("'") and cell("Aliyev") == "Aliyev" and cell(5) == 5


def test_missing_schema_returns_409(api, auth, student):
    auth(api, student)
    jid = pendulum_journal(api)
    LabJournal.objects.filter(pk=jid).update(schema_version=999)
    assert api.get(f"/api/v1/labs/{jid}/export/").status_code == 409


def test_sms_codes_limited_per_account(api, codes):
    from apps.accounts.services import send_code

    u = User.objects.create(username="t.sms", phone="+998907000001", role=Role.TEACHER)
    for _ in range(5):
        send_code(u, "verify")
    from rest_framework.exceptions import Throttled

    with pytest.raises(Throttled):
        send_code(u, "verify")


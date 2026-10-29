import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.models import User
from apps.schools.models import Classroom, ClassroomMember

from .conftest import PASSWORD, make_user

pytestmark = pytest.mark.django_db


def test_schools_public_search(api, school):
    r = api.get("/api/v1/schools/?region=toshkent_sh&q=12")
    assert r.status_code == 200 and r.data["count"] == 1
    assert r.data["results"][0]["region_name"] == "Toshkent shahri"


def test_teacher_creates_classroom(api, auth, teacher):
    auth(api, teacher)
    r = api.post("/api/v1/classrooms/", {"name": "11-B", "grade": 11}, format="json")
    assert r.status_code == 201, r.data
    assert r.data["join_code"].startswith("FZ-") and r.data["my_role"] == "teacher"
    assert r.data["school"] == teacher.school_id and r.data["student_count"] == 0


def test_student_cannot_create_classroom(api, auth, student):
    auth(api, student)
    assert api.post("/api/v1/classrooms/", {"name": "X", "grade": 10}, format="json").status_code == 403


def test_student_sees_own_classroom_without_code(api, auth, student, classroom):
    auth(api, student)
    r = api.get("/api/v1/classrooms/")
    assert r.data["count"] == 1
    assert "join_code" not in r.data["results"][0]


def test_other_teacher_cannot_access_classroom(api, auth, other_teacher, classroom, student):
    """IDOR: boshqa o'qituvchining sinfi ko'rinmaydi (TZ 11.3, 5-band)."""
    auth(api, other_teacher)
    assert api.get(f"/api/v1/classrooms/{classroom.id}/").status_code == 404
    assert api.get(f"/api/v1/classrooms/{classroom.id}/students/").status_code == 404
    assert api.post(f"/api/v1/classrooms/{classroom.id}/students/{student.id}/reset-password/").status_code == 404


def test_join_code_refresh_and_disable(api, auth, teacher, classroom):
    auth(api, teacher)
    old = classroom.join_code
    r = api.post(f"/api/v1/classrooms/{classroom.id}/join-code/", {"expires_days": None}, format="json")
    assert r.status_code == 200 and r.data["join_code"] != old and r.data["join_code_expires_at"] is None
    assert api.delete(f"/api/v1/classrooms/{classroom.id}/join-code/").status_code == 204
    classroom.refresh_from_db()
    assert classroom.join_code is None


def test_existing_student_joins_by_code(api, auth, teacher, school):
    c2 = Classroom.objects.create(name="11-A", grade=11, school=school)
    ClassroomMember.objects.create(classroom=c2, user=teacher, role="teacher")
    c2.refresh_join_code()
    s = make_user(school=None, username="yangi.oquvchi")
    auth(api, s)
    r = api.post("/api/v1/classrooms/join/", {"code": c2.join_code}, format="json")
    assert r.status_code == 200
    s.refresh_from_db()
    assert s.school == school
    assert api.post("/api/v1/classrooms/join/", {"code": c2.join_code}, format="json").status_code == 409


def test_import_students_json(api, auth, teacher, classroom):
    auth(api, teacher)
    r = api.post(f"/api/v1/classrooms/{classroom.id}/students/import/", {"students": [
        {"first_name": "Vali", "last_name": "To'xtayev"}, {"first_name": "Vali", "last_name": "To'xtayev"}]},
        format="json")
    assert r.status_code == 201, r.data
    names = [x["username"] for x in r.data["created"]]
    assert names == ["toxtayev.vali", "toxtayev.vali2"]
    u = User.objects.get(username="toxtayev.vali")
    assert u.must_change_password and u.check_password(r.data["created"][0]["password"])
    # Yangi o'quvchi vaqtinchalik parol bilan kira oladi
    api.credentials()
    r2 = api.post("/api/v1/auth/login/", {"login": "toxtayev.vali", "password": r.data["created"][0]["password"]},
                  format="json")
    assert r2.status_code == 200 and r2.data["user"]["must_change_password"] is True


def test_import_students_csv_and_xlsx(api, auth, teacher, classroom):
    auth(api, teacher)
    csv_file = SimpleUploadedFile("sinf.csv", "Familiya;Ism\nKarimov;Aziz\nSaidova;Malika\n".encode("utf-8-sig"))
    r = api.post(f"/api/v1/classrooms/{classroom.id}/students/import/", {"file": csv_file}, format="multipart")
    assert r.status_code == 201, r.data
    assert len(r.data["created"]) == 2

    from openpyxl import Workbook

    wb = Workbook()
    wb.active.append(["Фамилия", "Имя"])
    wb.active.append(["Ivanov", "Petr"])
    buf = io.BytesIO()
    wb.save(buf)
    xlsx = SimpleUploadedFile("sinf.xlsx", buf.getvalue())
    r = api.post(f"/api/v1/classrooms/{classroom.id}/students/import/", {"file": xlsx}, format="multipart")
    assert r.status_code == 201 and r.data["created"][0]["username"] == "ivanov.petr"

    bad = SimpleUploadedFile("sinf.pdf", b"%PDF")
    r = api.post(f"/api/v1/classrooms/{classroom.id}/students/import/", {"file": bad}, format="multipart")
    assert r.status_code == 400


def test_reset_move_remove_student(api, auth, teacher, classroom, student, school):
    auth(api, teacher)
    r = api.post(f"/api/v1/classrooms/{classroom.id}/students/{student.id}/reset-password/")
    assert r.status_code == 200
    student.refresh_from_db()
    assert student.check_password(r.data["password"]) and student.must_change_password

    c2 = Classroom.objects.create(name="10-B", grade=10, school=school)
    ClassroomMember.objects.create(classroom=c2, user=teacher, role="teacher")
    r = api.post(f"/api/v1/classrooms/{classroom.id}/students/{student.id}/move/", {"classroom_id": c2.id},
                 format="json")
    assert r.status_code == 200
    assert c2.memberships.filter(user=student).exists()
    assert not classroom.memberships.filter(user=student).exists()
    assert api.delete(f"/api/v1/classrooms/{c2.id}/students/{student.id}/").status_code == 204


def test_add_assistant_teacher(api, auth, teacher, other_teacher, classroom, student):
    auth(api, teacher)
    r = api.post(f"/api/v1/classrooms/{classroom.id}/teachers/", {"login": "+998907778899"}, format="json")
    assert r.status_code == 201
    assert api.post(f"/api/v1/classrooms/{classroom.id}/teachers/", {"login": "+998907778899"},
                    format="json").status_code == 409
    # O'quvchini o'qituvchi sifatida qo'shib bo'lmaydi
    assert api.post(f"/api/v1/classrooms/{classroom.id}/teachers/", {"login": "aliyev.vali"},
                    format="json").status_code == 400
    # Yordamchi endi sinfni ko'radi
    auth(api, other_teacher)
    assert api.get(f"/api/v1/classrooms/{classroom.id}/students/").status_code == 200
    # Oxirgi o'qituvchini olib tashlab bo'lmaydi
    auth(api, teacher)
    assert api.delete(f"/api/v1/classrooms/{classroom.id}/teachers/{other_teacher.id}/").status_code == 204
    assert api.delete(f"/api/v1/classrooms/{classroom.id}/teachers/{teacher.id}/").status_code == 400


def test_archive_instead_of_delete(api, auth, teacher, classroom):
    auth(api, teacher)
    assert api.delete(f"/api/v1/classrooms/{classroom.id}/").status_code == 204
    classroom.refresh_from_db()
    assert classroom.is_archived and classroom.join_code is None
    assert api.get("/api/v1/classrooms/").data["count"] == 0
    assert api.get("/api/v1/classrooms/?archived=1").data["count"] == 1


def test_student_cannot_patch_classroom(api, auth, student, classroom):
    auth(api, student)
    r = api.patch(f"/api/v1/classrooms/{classroom.id}/", {"name": "Buzilgan"}, format="json")
    assert r.status_code == 403


def test_student_login_password_unchanged_fixture():
    assert PASSWORD

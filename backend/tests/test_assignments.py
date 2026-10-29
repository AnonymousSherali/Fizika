import math
import uuid
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.assignments.models import Assignment, Submission
from apps.quizzes.models import Attempt

from .conftest import make_user

pytestmark = pytest.mark.django_db


def lab_payload(classroom, **kw):
    d = {"type": "lab", "title": "Mayatnik: g ni aniqlash", "classrooms": [classroom.id], "simulation": "mayatnik",
         "min_rows": 3, "due_at": (timezone.now() + timedelta(days=3)).isoformat()}
    d.update(kw)
    return d


def test_payload(classroom, **kw):
    d = {"type": "test", "title": "Kepler testi", "classrooms": [classroom.id],
         "quiz_config": {"topics": ["kepler"], "count": 4, "problems": 1, "time_limit_min": 20},
         "max_attempts": 2, "show_answers": "immediately"}
    d.update(kw)
    return d


test_payload.__test__ = False  # pytest buni test deb olmasin


def pendulum_journal(api, n=4, theta=10):
    rows = [[L, theta, 9.81, round(2 * math.pi * math.sqrt(L / 9.81), 3), 5, 9.79, 0.2]
            for L in (0.5, 1.0, 1.5, 2.0)[:n]]
    r = api.post("/api/v1/labs/", {"client_id": str(uuid.uuid4()), "simulation": "mayatnik", "rows": rows},
                 format="json")
    assert r.status_code == 201, r.data
    return r.data["id"]


def test_teacher_creates_lab_assignment(api, auth, teacher, classroom):
    auth(api, teacher)
    r = api.post("/api/v1/assignments/", lab_payload(classroom), format="json")
    assert r.status_code == 201, r.data
    assert r.data["stats"] == {"students": 0, "submitted": 0, "graded": 0, "returned": 0}


def test_assignment_validation(api, auth, teacher, other_teacher, classroom, school):
    auth(api, teacher)
    r = api.post("/api/v1/assignments/", lab_payload(classroom, simulation=None), format="json")
    assert r.status_code == 400 and "simulation" in r.data["error"]["fields"]
    r = api.post("/api/v1/assignments/", test_payload(classroom, quiz_config={"topics": ["yoq"]}), format="json")
    assert r.status_code == 400
    # Boshqa o'qituvchining sinfiga topshiriq berib bo'lmaydi
    auth(api, other_teacher)
    r = api.post("/api/v1/assignments/", lab_payload(classroom), format="json")
    assert r.status_code == 400 and "classrooms" in r.data["error"]["fields"]


def test_student_cannot_create(api, auth, student, classroom):
    auth(api, student)
    assert api.post("/api/v1/assignments/", lab_payload(classroom), format="json").status_code == 403


def test_lab_full_cycle(api, auth, teacher, student, classroom):
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", lab_payload(classroom), format="json").data["id"]

    # O'quvchi ro'yxatida — "new", qadamlar modeldan
    auth(api, student)
    lst = api.get("/api/v1/assignments/").data["results"]
    assert len(lst) == 1 and lst[0]["my_status"] == "new" and len(lst[0]["steps"]) == 6
    assert "stats" not in lst[0] and lst[0]["simulation_page"] == "modellar/mayatnik_model.html"

    jid = pendulum_journal(api)
    r = api.post(f"/api/v1/assignments/{aid}/submit/", {"lab_journal_id": jid, "conclusion": "qisqa"}, format="json")
    assert r.status_code == 400 and "conclusion" in r.data["error"]["fields"]
    r = api.post(f"/api/v1/assignments/{aid}/submit/", {
        "lab_journal_id": jid, "conclusion": "T² ning L ga bog'liqligi chiziqli, g ≈ 9,8 m/s² chiqdi."},
        format="json")
    assert r.status_code == 200, r.data
    assert r.data["status"] == "submitted" and r.data["suggested_grade"] == 5
    assert r.data["auto_score"]["passed"] == r.data["auto_score"]["total"]
    assert r.data["lab_snapshot"]["columns"][0]["label"] == "L (m)"
    # Ikkinchi marta topshirib bo'lmaydi
    assert api.post(f"/api/v1/assignments/{aid}/submit/", {
        "lab_journal_id": jid, "conclusion": "x" * 30}, format="json").status_code == 409

    # O'qituvchi ro'yxati
    auth(api, teacher)
    roster = api.get(f"/api/v1/assignments/{aid}/submissions/").data
    assert len(roster) == 1 and roster[0]["status"] == "submitted" and roster[0]["suggested_grade"] == 5
    sid = roster[0]["submission_id"]

    # Qaytarish → o'quvchi qayta topshiradi → baho
    r = api.post(f"/api/v1/submissions/{sid}/return/", {"comment": "Grafikni qayta chizing"}, format="json")
    assert r.status_code == 200 and r.data["status"] == "returned"
    auth(api, student)
    assert api.get("/api/v1/assignments/").data["results"][0]["my_status"] == "returned"
    r = api.post(f"/api/v1/assignments/{aid}/submit/", {
        "lab_journal_id": jid, "conclusion": "Qayta tekshirdim: g = 9,81 m/s², xatolik 0,2%."}, format="json")
    assert r.status_code == 200
    auth(api, teacher)
    assert api.post(f"/api/v1/submissions/{sid}/grade/", {"grade": 7}, format="json").status_code == 400
    r = api.post(f"/api/v1/submissions/{sid}/grade/", {"grade": 5, "comment": "Zo'r!"}, format="json")
    assert r.status_code == 200 and r.data["status"] == "graded"
    auth(api, student)
    a = api.get("/api/v1/assignments/").data["results"][0]
    assert a["my_status"] == "graded" and a["my_grade"]["grade"] == 5 and a["my_grade"]["comment"] == "Zo'r!"


def test_auto_score_low_quality(api, auth, teacher, student, classroom):
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", lab_payload(classroom, min_rows=4, require_conclusion=False),
                   format="json").data["id"]
    auth(api, student)
    jid = pendulum_journal(api, n=2)
    r = api.post(f"/api/v1/assignments/{aid}/submit/", {"lab_journal_id": jid}, format="json")
    assert r.status_code == 400  # min_rows
    # Yetarli qator, lekin katta burchak — xatolik > 5% emas, R² yaxshi
    jid = pendulum_journal(api, n=4, theta=60)
    r = api.post(f"/api/v1/assignments/{aid}/submit/", {"lab_journal_id": jid}, format="json")
    assert r.status_code == 200 and r.data["suggested_grade"] == 5


def test_submit_other_users_journal_forbidden(api, auth, teacher, student, classroom):
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", lab_payload(classroom), format="json").data["id"]
    other = make_user(username="sinfdosh", school=classroom.school)
    from apps.schools.models import ClassroomMember

    ClassroomMember.objects.create(classroom=classroom, user=other)
    auth(api, other)
    jid = pendulum_journal(api)
    auth(api, student)
    r = api.post(f"/api/v1/assignments/{aid}/submit/", {"lab_journal_id": jid, "conclusion": "x" * 30},
                 format="json")
    assert r.status_code == 404


def test_due_date_and_late(api, auth, teacher, student, classroom):
    auth(api, teacher)
    past = (timezone.now() - timedelta(hours=1)).isoformat()
    aid = api.post("/api/v1/assignments/", lab_payload(classroom, due_at=past), format="json").data["id"]
    auth(api, student)
    assert api.get("/api/v1/assignments/").data["results"][0]["my_status"] == "overdue"
    jid = pendulum_journal(api)
    r = api.post(f"/api/v1/assignments/{aid}/submit/", {"lab_journal_id": jid, "conclusion": "x" * 30},
                 format="json")
    assert r.status_code == 403
    Assignment.objects.filter(pk=aid).update(allow_late=True)
    r = api.post(f"/api/v1/assignments/{aid}/submit/", {"lab_journal_id": jid, "conclusion": "x" * 30},
                 format="json")
    assert r.status_code == 200 and r.data["is_late"] is True


def test_not_started_yet(api, auth, teacher, student, classroom):
    auth(api, teacher)
    future = (timezone.now() + timedelta(days=1)).isoformat()
    aid = api.post("/api/v1/assignments/", test_payload(classroom, starts_at=future), format="json").data["id"]
    auth(api, student)
    r = api.post("/api/v1/quiz/attempts/", {"assignment_id": aid}, format="json")
    assert r.status_code == 403


def test_test_assignment_cycle(api, auth, teacher, student, classroom):
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", test_payload(classroom), format="json").data["id"]
    auth(api, student)
    a = api.get(f"/api/v1/assignments/{aid}/").data
    assert a["attempts_left"] == 2 and a["my_status"] == "new"

    r = api.post("/api/v1/quiz/attempts/", {"assignment_id": aid}, format="json")
    assert r.status_code == 201 and len(r.data["items"]) == 5
    att = Attempt.objects.get(pk=r.data["id"])
    # Tugallanmagan urinish qayta "boshlansa" — o'shasi qaytadi
    assert api.post("/api/v1/quiz/attempts/", {"assignment_id": aid}, format="json").data["id"] == str(att.id)
    first = att.items.filter(question__isnull=False).select_related("question").first()
    api.post(f"/api/v1/quiz/attempts/{att.id}/answer/", {
        "item_id": first.order, "answer": str(first.option_order.index(first.question.correct_index))}, format="json")
    res = api.post(f"/api/v1/quiz/attempts/{att.id}/finish/").data
    assert 0 < res["percent"] < 100

    sub = Submission.objects.get(assignment_id=aid, student=student)
    assert sub.status == "graded" and sub.attempt_id == att.id and sub.grade == 2
    a = api.get(f"/api/v1/assignments/{aid}/").data
    assert a["attempts_left"] == 1 and a["my_status"] == "graded"

    # 2-urinish: hammasi to'g'ri → eng yaxshisi olinadi
    att2 = Attempt.objects.get(pk=api.post("/api/v1/quiz/attempts/", {"assignment_id": aid}, format="json").data["id"])
    for it in att2.items.select_related("question", "problem"):
        ans = (str(it.option_order.index(it.question.correct_index)) if it.question_id
               else str(it.problem.answer))
        api.post(f"/api/v1/quiz/attempts/{att2.id}/answer/", {"item_id": it.order, "answer": ans}, format="json")
    api.post(f"/api/v1/quiz/attempts/{att2.id}/finish/")
    sub.refresh_from_db()
    assert sub.grade == 5 and sub.attempt_id == att2.id
    # Urinishlar tugadi
    assert api.post("/api/v1/quiz/attempts/", {"assignment_id": aid}, format="json").status_code == 409

    # O'qituvchi submission'da test natijasini ko'radi va bahoni o'zgartira oladi
    auth(api, teacher)
    r = api.get(f"/api/v1/submissions/{sub.id}/")
    assert r.data["attempt_result"]["percent"] == 100
    r = api.post(f"/api/v1/submissions/{sub.id}/grade/", {"grade": 4, "comment": "Kechikdi"}, format="json")
    assert r.status_code == 200 and r.data["grade"] == 4


def test_test_show_answers_after_due(api, auth, teacher, student, classroom):
    auth(api, teacher)
    due = (timezone.now() + timedelta(days=1)).isoformat()
    aid = api.post("/api/v1/assignments/", test_payload(classroom, show_answers="after_due", due_at=due),
                   format="json").data["id"]
    auth(api, student)
    att_id = api.post("/api/v1/quiz/attempts/", {"assignment_id": aid}, format="json").data["id"]
    r = api.post(f"/api/v1/quiz/attempts/{att_id}/answer/", {"item_id": 0, "answer": "0"}, format="json")
    if r.status_code == 200:
        assert r.data["is_correct"] is None  # darhol ko'rsatilmaydi
    res = api.post(f"/api/v1/quiz/attempts/{att_id}/finish/").data
    assert res["answers_visible"] is False and res["review"] is None
    Assignment.objects.filter(pk=aid).update(due_at=timezone.now() - timedelta(minutes=1))
    res = api.get(f"/api/v1/quiz/attempts/{att_id}/result/").data
    assert res["answers_visible"] is True and isinstance(res["review"], list)


def test_late_penalty_100_scale(api, auth, teacher, student, classroom):
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", test_payload(
        classroom, grading_scale=100, allow_late=True, late_penalty_pct=20,
        due_at=(timezone.now() + timedelta(hours=1)).isoformat()), format="json").data["id"]
    auth(api, student)
    att = Attempt.objects.get(pk=api.post("/api/v1/quiz/attempts/", {"assignment_id": aid}, format="json").data["id"])
    for it in att.items.select_related("question", "problem"):
        ans = (str(it.option_order.index(it.question.correct_index)) if it.question_id else str(it.problem.answer))
        api.post(f"/api/v1/quiz/attempts/{att.id}/answer/", {"item_id": it.order, "answer": ans}, format="json")
    Assignment.objects.filter(pk=aid).update(due_at=timezone.now() - timedelta(minutes=1))
    api.post(f"/api/v1/quiz/attempts/{att.id}/finish/")
    sub = Submission.objects.get(assignment_id=aid)
    assert sub.is_late and sub.grade == 80


def test_teacher_cannot_see_other_assignment_submission(api, auth, teacher, other_teacher, student, classroom):
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", lab_payload(classroom), format="json").data["id"]
    auth(api, student)
    jid = pendulum_journal(api)
    sid = api.post(f"/api/v1/assignments/{aid}/submit/", {"lab_journal_id": jid, "conclusion": "x" * 30},
                   format="json").data["id"]
    auth(api, other_teacher)
    assert api.get(f"/api/v1/submissions/{sid}/").status_code == 404
    assert api.post(f"/api/v1/submissions/{sid}/grade/", {"grade": 5}, format="json").status_code == 404
    assert api.get(f"/api/v1/assignments/{aid}/").status_code == 404
    # O'quvchi o'zini baholay olmaydi
    auth(api, student)
    assert api.post(f"/api/v1/submissions/{sid}/grade/", {"grade": 5}, format="json").status_code == 403


def test_owner_only_edit_delete(api, auth, teacher, other_teacher, classroom):
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", lab_payload(classroom), format="json").data["id"]
    api.post(f"/api/v1/classrooms/{classroom.id}/teachers/", {"login": "+998907778899"}, format="json")
    auth(api, other_teacher)  # yordamchi ko'radi, lekin o'zgartira olmaydi
    assert api.get(f"/api/v1/assignments/{aid}/").status_code == 200
    assert api.patch(f"/api/v1/assignments/{aid}/", {"title": "x"}, format="json").status_code == 403
    auth(api, teacher)
    assert api.patch(f"/api/v1/assignments/{aid}/", {"title": "Yangi nom"}, format="json").status_code == 200
    assert api.delete(f"/api/v1/assignments/{aid}/").status_code == 204


def test_deleted_student_attempt_anonymized(api, auth, student):
    """FT-1.7: hisob o'chirilsa test natijasi anonim qoladi (statistika uchun)."""
    auth(api, student)
    aid = api.post("/api/v1/quiz/attempts/", {"topics": ["kepler"], "count": 1}, format="json").data["id"]
    student.delete()
    assert Attempt.objects.get(pk=aid).user is None

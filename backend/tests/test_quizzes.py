from datetime import timedelta

import pytest
from django.utils import timezone

from apps.quizzes.models import Attempt, AttemptItem, Problem, Question, Status, Topic

from .conftest import make_user

pytestmark = pytest.mark.django_db


def correct_shown_index(item: AttemptItem) -> int:
    """Test uchun: o'quvchiga ko'rsatilgan tartibda to'g'ri variant qaysi raqamda."""
    return item.option_order.index(item.question.correct_index)


def test_topics_with_counts(api):
    r = api.get("/api/v1/quiz/topics/")
    assert r.status_code == 200 and len(r.data) == 15
    kepler = next(t for t in r.data if t["key"] == "kepler")
    assert kepler["questions"] == 20 and kepler["problems"] == 6


def test_topics_russian(api):
    r = api.get("/api/v1/quiz/topics/", HTTP_ACCEPT_LANGUAGE="ru")
    assert r.data[0]["title"] == "Резерфорд"


def test_practice_includes_answers(api):
    r = api.get("/api/v1/quiz/practice/?topics=linza,fotoeffekt&count=10&seed=1")
    assert r.status_code == 200 and len(r.data) == 10
    assert {q["topic"] for q in r.data} == {"linza", "fotoeffekt"}
    assert all(0 <= q["correct"] <= 3 and q["explanation"] for q in r.data)
    # Har ikkala mavzudan teng (navbat bilan) olinadi
    assert sum(q["topic"] == "linza" for q in r.data) == 5


def test_practice_unknown_topic(api):
    assert api.get("/api/v1/quiz/practice/?topics=yoq").status_code == 400


def test_attempt_hides_answers_and_scores(api, auth, student):
    auth(api, student)
    r = api.post("/api/v1/quiz/attempts/", {"topics": ["kepler"], "count": 4, "problems": 2}, format="json")
    assert r.status_code == 201, r.data
    items = r.data["items"]
    assert len(items) == 6
    assert all("correct" not in it and "correct_index" not in it for it in items)
    attempt = Attempt.objects.get(pk=r.data["id"])
    assert attempt.max_score == sum(it["points"] for it in items)

    for it in attempt.items.select_related("question", "problem"):
        if it.question_id:
            ans = correct_shown_index(it)
        else:
            ans = str(it.problem.answer).replace(".", ",") + " " + it.problem.unit
        rr = api.post(f"/api/v1/quiz/attempts/{attempt.id}/answer/", {"item_id": it.order, "answer": ans},
                      format="json")
        assert rr.status_code == 200 and rr.data["is_correct"] is True, (rr.data, ans)
    res = api.post(f"/api/v1/quiz/attempts/{attempt.id}/finish/")
    assert res.status_code == 200
    assert res.data["percent"] == 100 and res.data["grade"] == 5 and res.data["review"] == []
    assert sum(b["all"] for b in res.data["topic_breakdown"].values()) == 6
    # Yakunlangandan keyin javob qabul qilinmaydi
    rr = api.post(f"/api/v1/quiz/attempts/{attempt.id}/answer/", {"item_id": 0, "answer": "0"}, format="json")
    assert rr.status_code == 400


def test_wrong_answers_review_and_stats(api, auth, student):
    auth(api, student)
    r = api.post("/api/v1/quiz/attempts/", {"topics": ["linza"], "count": 2, "problems": 0}, format="json")
    attempt = Attempt.objects.get(pk=r.data["id"])
    it = attempt.items.select_related("question").first()
    wrong = (correct_shown_index(it) + 1) % 4
    api.post(f"/api/v1/quiz/attempts/{attempt.id}/answer/", {"item_id": it.order, "answer": str(wrong)},
             format="json")
    res = api.post(f"/api/v1/quiz/attempts/{attempt.id}/finish/").data
    assert res["percent"] < 100 and res["grade"] == 2
    assert len(res["review"]) == 2  # bittasi xato, bittasi javobsiz
    reviewed = next(x for x in res["review"] if x["item_id"] == it.order)
    assert reviewed["correct"] and reviewed["explanation"] and reviewed["given"]
    q = Question.objects.get(pk=it.question_id)
    assert q.stats_total == 1 and q.stats_correct == 0 and sum(q.stats_choices) == 1


def test_calc_answer_needs_number(api, auth, student):
    auth(api, student)
    r = api.post("/api/v1/quiz/attempts/", {"topics": ["kepler"], "count": 0, "problems": 1}, format="json")
    rr = api.post(f"/api/v1/quiz/attempts/{r.data['id']}/answer/", {"item_id": 0, "answer": "abc"}, format="json")
    assert rr.status_code == 400


def test_time_limit_auto_finish(api, auth, student):
    auth(api, student)
    r = api.post("/api/v1/quiz/attempts/", {"topics": ["om_qonuni"], "count": 2, "time_limit_min": 5},
                 format="json")
    assert r.data["remaining_seconds"] > 290
    Attempt.objects.filter(pk=r.data["id"]).update(deadline_at=timezone.now() - timedelta(seconds=1))
    rr = api.post(f"/api/v1/quiz/attempts/{r.data['id']}/answer/", {"item_id": 0, "answer": "0"}, format="json")
    assert rr.status_code == 400  # vaqt tugagan — avtomatik yakunlangan
    res = api.get(f"/api/v1/quiz/attempts/{r.data['id']}/result/")
    assert res.status_code == 200 and res.data["percent"] == 0


def test_attempts_are_private(api, auth, student, classroom):
    auth(api, student)
    aid = api.post("/api/v1/quiz/attempts/", {"topics": ["kepler"], "count": 1}, format="json").data["id"]
    other = make_user(username="boshqa")
    auth(api, other)
    assert api.get(f"/api/v1/quiz/attempts/{aid}/").status_code == 404


def test_my_attempts_list(api, auth, student):
    auth(api, student)
    aid = api.post("/api/v1/quiz/attempts/", {"topics": ["kepler"], "count": 1}, format="json").data["id"]
    assert api.get("/api/v1/quiz/attempts/").data["count"] == 0
    api.post(f"/api/v1/quiz/attempts/{aid}/finish/")
    assert api.get("/api/v1/quiz/attempts/").data["count"] == 1


# ---------- Savollar banki ----------
def q_payload(**kw):
    d = {"topic": "kepler", "level": "asosiy", "text_uz": "Yangi savol?", "correct_index": 2,
         "options": [{"uz": "A"}, {"uz": "B"}, {"uz": "C"}, {"uz": "D"}], "explanation_uz": "Chunki C."}
    d.update(kw)
    return d


def test_teacher_question_draft_and_permissions(api, auth, teacher, other_teacher, student):
    auth(api, student)
    assert api.get("/api/v1/quiz/questions/").status_code == 403
    auth(api, teacher)
    r = api.post("/api/v1/quiz/questions/", q_payload(status="approved"), format="json")
    assert r.status_code == 400  # o'qituvchi o'zi tasdiqlay olmaydi
    r = api.post("/api/v1/quiz/questions/", q_payload(), format="json")
    assert r.status_code == 201 and r.data["status"] == "draft"
    qid = r.data["id"]
    assert api.patch(f"/api/v1/quiz/questions/{qid}/", {"text_uz": "Tahrir"}, format="json").status_code == 200
    # Boshqa o'qituvchi qoralamani ko'rmaydi
    auth(api, other_teacher)
    assert api.get(f"/api/v1/quiz/questions/{qid}/").status_code == 404
    # Tasdiqlangan bank savoli o'qiladi, lekin tahrirlanmaydi
    bank_id = Question.objects.filter(status=Status.APPROVED).first().id
    assert api.get(f"/api/v1/quiz/questions/{bank_id}/").status_code == 200
    assert api.patch(f"/api/v1/quiz/questions/{bank_id}/", {"text_uz": "x"}, format="json").status_code == 403


def test_question_validation(api, auth, teacher):
    auth(api, teacher)
    r = api.post("/api/v1/quiz/questions/", q_payload(options=[{"uz": "A"}, {"uz": "a"}, {"uz": "C"}, {"uz": "D"}]),
                 format="json")
    assert r.status_code == 400 and "options" in r.data["error"]["fields"]
    r = api.post("/api/v1/quiz/questions/", q_payload(correct_index=5), format="json")
    assert r.status_code == 400


def test_used_question_archived_not_deleted(api, auth, teacher, student):
    auth(api, teacher)
    qid = api.post("/api/v1/quiz/questions/", q_payload(topic="linza"), format="json").data["id"]
    q = Question.objects.get(pk=qid)
    a = Attempt.objects.create(user=student)
    AttemptItem.objects.create(attempt=a, order=0, question=q, option_order=[0, 1, 2, 3])
    assert api.delete(f"/api/v1/quiz/questions/{qid}/").status_code == 204
    q.refresh_from_db()
    assert q.status == Status.ARCHIVED


def test_problem_crud(api, auth, teacher):
    auth(api, teacher)
    r = api.post("/api/v1/quiz/problems/", {"topic": "om_qonuni", "text_uz": "U=6 V, R=3 Ω. I=?", "answer": 2,
                                            "unit": "A", "tolerance_pct": 2, "solution_uz": "I=U/R"}, format="json")
    assert r.status_code == 201
    pid = r.data["id"]
    assert api.delete(f"/api/v1/quiz/problems/{pid}/").status_code == 204
    assert not Problem.objects.filter(pk=pid).exists()


def test_import_questions_xlsx(api, auth, teacher):
    import io

    from django.core.files.uploadedfile import SimpleUploadedFile
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["Mavzu", "Daraja", "Savol", "A", "B", "C", "D", "To'g'ri", "Izoh"])
    ws.append(["Kepler", "Chuqur", "Afeliyda tezlik?", "Eng katta", "Eng kichik", "Nol", "Cheksiz", "B", "L saqlanadi"])
    ws.append(["Yo'q mavzu", "Asosiy", "?", "1", "2", "3", "4", "A", ""])
    ws.append(["linza", "Asosiy", "Takror", "1", "1", "3", "4", "A", ""])
    buf = io.BytesIO()
    wb.save(buf)
    auth(api, teacher)
    r = api.post("/api/v1/quiz/questions/import/", {"file": SimpleUploadedFile("s.xlsx", buf.getvalue())},
                 format="multipart")
    assert r.status_code == 201 and r.data["created"] == 1 and len(r.data["errors"]) == 2
    q = Question.objects.get(text_uz="Afeliyda tezlik?")
    assert q.level == "chuqur" and q.correct_index == 1 and q.status == "draft"


def test_import_bank_idempotent(db):
    from django.core.management import call_command

    call_command("import_quiz_bank", verbosity=0)
    assert Question.objects.filter(status=Status.APPROVED).count() == 170
    assert Problem.objects.count() == 48 and Topic.objects.count() == 15

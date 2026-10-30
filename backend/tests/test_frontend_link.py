"""Admin panel → sayt bog'lanishi: mashq banki, katalog, parametrli masala namunasi, formula xavfsizligi."""
import pytest

from apps.labs.analysis import safe_eval
from apps.quizzes.models import Problem, Question, Status
from apps.simulations.models import Simulation

pytestmark = pytest.mark.django_db


def test_bank_matches_embedded_format_and_follows_admin_status(api):
    r = api.get("/api/v1/quiz/bank/")
    assert r.status_code == 200
    b = r.data
    # Saytdagi o'rnatilgan bank bilan bir xil: 15 mavzu, 170 savol, 48 masala
    assert len(b["topics"]) == 15 and len(b["questions"]) == 170 and len(b["problems"]) == 48
    q = b["questions"][0]
    assert set(q) >= {"tag", "q", "o", "correct", "ex"} and " · " in q["tag"] and len(q["o"]) == 4
    p = b["problems"][0]
    assert set(p) >= {"tag", "q", "ans", "unit", "tol", "sol"} and p["tag"].endswith(" · Hisoblash")
    # Admin savolni arxivlasa — saytdagi mashqdan ham yo'qoladi
    Question.objects.filter(pk=q["id"]).update(status=Status.ARCHIVED)
    assert all(x["id"] != q["id"] for x in api.get("/api/v1/quiz/bank/").data["questions"])


def test_bank_renders_parametrized_problem_with_fresh_numbers(api):
    p = Problem.objects.filter(status=Status.APPROVED).first()
    Problem.objects.filter(pk=p.pk).update(text_uz="U = {U} V, R = 10 Ω. I = ?", params={"U": [2, 200, 1]},
                                           formula="U/10", solution_uz="I = {U}/10 = {answer} A")
    items = [next(x for x in api.get("/api/v1/quiz/bank/").data["problems"] if x["id"] == p.pk) for _ in range(5)]
    assert all("{" not in x["q"] and "{" not in x["sol"] for x in items)
    assert len({x["ans"] for x in items}) > 1  # har safar boshqa sonlar


def test_catalog_hides_inactive_simulation(api):
    from django.core.cache import cache

    Simulation.objects.filter(slug="linza").update(is_active=False)
    cache.clear()  # katalog 10 daqiqa keshlanadi
    try:
        slugs = [s["slug"] for s in api.get("/api/v1/simulations/").data]
        assert "linza" not in slugs and "kepler" in slugs
    finally:
        cache.clear()  # keyingi testlarga 14 modelli kesh qolmasin


def test_problem_preview_and_create_without_answer(api, auth, teacher):
    auth(api, teacher)
    body = {"topic": "mayatnik", "text_uz": "Jism {h} m balandlikdan tushdi. Tezlik?", "unit": "m/s",
            "tolerance_pct": 2, "params": {"h": [5, 20, 5]}, "formula": "(2*9.8*h)**0.5",
            "solution_uz": "v = √(2gh) = {answer} m/s"}
    r = api.post("/api/v1/quiz/problems/preview/", body, format="json")
    assert r.status_code == 200 and len(r.data["samples"]) == 3
    s = r.data["samples"][0]
    assert "{" not in s["text"] and "{" not in s["solution"] and s["answer"] > 9
    assert Problem.objects.filter(text_uz=body["text_uz"]).count() == 0  # namuna saqlanmaydi
    r = api.post("/api/v1/quiz/problems/", body, format="json")
    assert r.status_code == 201, r.data
    assert r.data["status"] == "draft" and r.data["answer"] == pytest.approx((2 * 9.8 * 5) ** 0.5)
    # Oddiy masala javobsiz — xato
    r = api.post("/api/v1/quiz/problems/", {"topic": "mayatnik", "text_uz": "T = ?", "unit": "s"}, format="json")
    assert r.status_code == 400 and "answer" in r.data["error"]["fields"]


def test_problem_preview_rejects_dangerous_formula(api, auth, teacher):
    auth(api, teacher)
    body = {"topic": "mayatnik", "text_uz": "{h}", "unit": "", "tolerance_pct": 2, "params": {"h": [1, 2, 1]}}
    for f in ["9**9**9**9", "(-h)**0.5", "h*" * 200 + "1"]:
        r = api.post("/api/v1/quiz/problems/preview/", {**body, "formula": f}, format="json")
        assert r.status_code == 400, f


def test_problem_preview_requires_teacher(api, auth, student):
    assert api.post("/api/v1/quiz/problems/preview/", {}, format="json").status_code == 401
    auth(api, student)
    assert api.post("/api/v1/quiz/problems/preview/", {}, format="json").status_code == 403


def test_safe_eval_limits():
    assert safe_eval("2*m+1", {"m": 3}) == 7
    for e in ["9**9**9**9", "10**400", "(-8)**0.5", "1e308*10"]:
        with pytest.raises(ValueError):
            safe_eval(e, {})

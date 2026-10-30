"""Ruscha tarjima: savollar banki lug'atda to'liq, bazada ruscha matnlar, API ruscha javob beradi."""
import json
import re
from pathlib import Path

import pytest
from django.conf import settings

from apps.quizzes.management.commands.import_quiz_bank import grab
from apps.quizzes.models import Problem, Question

pytestmark = pytest.mark.django_db


def _ru_dict():
    t = (Path(settings.FRONTEND_DIR) / "i18n-ru.js").read_text(encoding="utf-8")
    return json.loads(t[t.index("{", t.index("window.FIZIKA_RU")):t.rindex("}") + 1])


def test_every_bank_text_has_russian_translation():
    ru = _ru_dict()
    page = (Path(settings.FRONTEND_DIR) / "testlar" / "bank.js").read_text(encoding="utf-8")
    texts = []
    for q in grab(page, "questions"):
        texts += [q["q"], q.get("ex", "")] + q["o"]
    for p in grab(page, "problems"):
        texts += [p["q"], p.get("sol", "")]
    # Faqat raqam/formula bo'lgan variantlar (masalan «1909», «+2e») tarjima talab qilmaydi
    missing = [t for t in texts if re.search(r"[A-Za-z]{3}", t) and " ".join(t.split()) not in ru]
    assert not missing, missing[:5]


def test_imported_bank_has_russian_fields():
    assert not Question.objects.filter(text_ru="").exists()
    # Faqat formuladan iborat izohlar («W = CU²/2 = ...») tarjimasiz qoladi — o'zbekchasi ko'rsatiladi
    untranslated = Question.objects.filter(explanation_ru="").values_list("explanation_uz", flat=True)
    assert not [e for e in untranslated if re.search(r"[A-Za-z]{3}", e)]
    assert not Problem.objects.filter(text_ru="").exists()
    q = Question.objects.get(text_uz="Rezerford tajribasi qaysi yilda o'tkazilgan?")
    assert "Резерфорд" in q.text_ru


def test_attempt_in_russian(api, auth, student):
    auth(api, student)
    r = api.post("/api/v1/quiz/attempts/", {"topics": ["rezerford"], "count": 3, "problems": 1}, format="json",
                 HTTP_ACCEPT_LANGUAGE="ru")
    assert r.status_code == 201, r.data
    assert all(re.search(r"[А-Яа-я]", it["text"]) for it in r.data["items"])


def test_dictionary_patterns_are_well_formed():
    """Andoza kalitida va tarjimasida "{}" soni bir xil bo'lishi kerak (aks holda qism yo'qoladi)."""
    bad = [k for k, v in _ru_dict().items() if k.count("{}") != v.count("{}")]
    assert not bad, bad[:5]

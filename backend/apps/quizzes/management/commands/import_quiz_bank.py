"""
testlar/testlar_online.html dagi savollar banki (170 savol + 48 masala) ni bazaga ko'chiradi (FT-6.3).
Qayta ishga tushirish xavfsiz: har bir savol matnidan olingan kalit bo'yicha yangilanadi.

    python manage.py import_quiz_bank [--frontend /yo'l/saytga]
"""
import hashlib
import json
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.quizzes.models import Level, Problem, Question, Status, Topic
from apps.simulations.models import Simulation

# Mavzu nomi (frontend TOPICS) → model slug (mavzu kaliti sifatida ishlatiladi)
TOPIC_SLUGS = {
    "Rezerford": "rezerford", "Kepler": "kepler", "Matematik mayatnik": "mayatnik",
    "Prujinali mayatnik": "prujinali_mayatnik", "Qiya tekislik": "qiya_tekislik", "Otilgan jism": "otilgan_jism",
    "Impuls": "impuls", "Gaz qonunlari": "gaz_qonunlari", "Om qonuni": "om_qonuni", "Kondensator": "kondensator",
    "Elektromagnit induksiya": "induksiya", "Yorug'lik sinishi": "yoruglik_sinishi", "Linza": "linza",
    "Fotoeffekt": "fotoeffekt", "Radioaktiv yemirilish": "radioaktiv_yemirilish",
}
_KEYS = "tag|q|o|correct|ex|unit|ans|tol|sol"


def js_array_to_python(js: str):
    """Frontenddagi JS massiv literalini (kalitlar tirnoqsiz, // izohlar) JSON orqali o'qiydi."""
    js = re.sub(r"^\s*//.*$", "", js, flags=re.M)
    js = re.sub(rf"([{{,]\s*)({_KEYS})\s*:", r'\1"\2":', js)
    js = js.replace("\\'", "'")
    js = re.sub(r",(\s*[\]}])", r"\1", js)
    return json.loads(js)


def grab(text: str, name: str):
    start = text.find(f"const {name} = [")
    if start < 0:
        raise CommandError(f"testlar_online.html da «{name}» topilmadi")
    end = text.index("\n        ];", start)
    return js_array_to_python(text[start + len(f"const {name} = "):end] + "\n]")


def source_key(*parts) -> str:
    return hashlib.sha1("|".join(parts).encode()).hexdigest()


class Command(BaseCommand):
    help = "Onlayn testdagi savollar va masalalarni bazaga import qiladi"

    def add_arguments(self, parser):
        parser.add_argument("--frontend", default=str(settings.FRONTEND_DIR))

    def handle(self, *args, **opts):
        root = Path(opts["frontend"])
        page = root / "testlar" / "testlar_online.html"
        if not page.exists():
            raise CommandError(f"{page} topilmadi")
        text = page.read_text(encoding="utf-8")
        topics_order = json.loads(re.search(r"const TOPICS = (\[.*?\]);", text).group(1))
        questions, problems = grab(text, "questions"), grab(text, "problems")
        ru = self._load_ru(root / "i18n-ru.js")
        with transaction.atomic():
            topics = {}
            for i, name in enumerate(topics_order):
                slug = TOPIC_SLUGS.get(name) or re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
                topics[name], _ = Topic.objects.update_or_create(
                    key=slug, defaults={"title_uz": name, "title_ru": ru.get(name, ""), "order": i,
                                        "simulation": Simulation.objects.filter(slug=slug).first()})
            nq = np_ = 0
            for q in questions:
                name, level = q["tag"].split(" · ")
                Question.objects.update_or_create(
                    source_key=source_key("q", q["q"]),
                    defaults={"topic": topics[name], "level": Level.CHUQUR if level == "Chuqur" else Level.ASOSIY,
                              "text_uz": q["q"], "options": [{"uz": o, "ru": ""} for o in q["o"]],
                              "correct_index": q["correct"], "explanation_uz": q.get("ex", ""),
                              "status": Status.APPROVED})
                nq += 1
            for p in problems:
                name = p["tag"].split(" · ")[0]
                Problem.objects.update_or_create(
                    source_key=source_key("p", p["q"]),
                    defaults={"topic": topics[name], "text_uz": p["q"], "answer": p["ans"], "unit": p.get("unit", ""),
                              "tolerance_pct": p["tol"], "solution_uz": p.get("sol", ""), "status": Status.APPROVED})
                np_ += 1
        self.stdout.write(self.style.SUCCESS(f"{len(topics)} mavzu, {nq} savol, {np_} masala import qilindi"))

    def _load_ru(self, path: Path) -> dict:
        if not path.exists():
            return {}
        t = path.read_text(encoding="utf-8")
        return json.loads(t[t.index("{", t.index("window.FIZIKA_RU")):t.rindex("}") + 1])

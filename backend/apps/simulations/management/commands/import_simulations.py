"""
Mavjud statik saytdan modellar katalogini bazaga ko'chiradi (TZ 13: scripts/import_simulations).

Manbalar (FRONTEND_DIR, standart — repozitoriy ildizi):
  index.html               — katalog kartalari: nom, tavsif, bo'lim, sinf, rasm, tartib
  modellar/*_model.html    — topshiriq qadamlari va jurnal ustunlari (window.labFields)
  model-tools.js           — kutilgan natijalar (TEACHER obyekti)
  i18n-ru.js               — rus tilidagi tarjimalar

Qayta ishga tushirish xavfsiz: yozuvlar slug bo'yicha yangilanadi, jurnal sxemasi
o'zgargan bo'lsagina yangi versiya yaratiladi.

    python manage.py import_simulations [--frontend /yo'l/saytga]
"""
import ast
import html
import json
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.simulations.models import LabSchema, Simulation, SimulationExpected, SimulationTask

TEXT_COLUMNS = {"Metall", "Jarayon", "Yo'nalish", "Sayyora", "Rejim", "Linza", "Tasvir"}

# Jurnal grafigi andozalari va serverda hisoblanadigan hosila natija (FT-4.5, FT-4.6).
# x/y — ustun kaliti boshlanishi (frontenddagi GRAPH_PRESETS bilan bir xil),
# expr — k (qiyalik) va b (kesishma) orqali formula, theory_col — nazariy qiymat ustuni.
ANALYSIS = {
    "mayatnik": {"x": "L", "y": "T nazariy", "yp": 2,
                 "derived": {"name": "g", "expr": "4*pi**2/k", "unit": "m/s²", "theory_col": "g"}},
    "prujinali_mayatnik": {"x": "m", "y": "T o'lch", "yp": 2,
                           "derived": {"name": "k", "expr": "4*pi**2/k", "unit": "N/m", "theory_col": "k"}},
    "om_qonuni": {"x": "U", "y": "I",
                  "derived": {"name": "R", "expr": "1/k", "unit": "Ω", "theory_col": "R"}},
    "gaz_qonunlari": {"x": "V", "xp": -1, "y": "p",
                      "derived": {"name": "pV", "expr": "k", "unit": "J", "theory_col": "pV"}},
    "kondensator": {"x": "d", "xp": -1, "y": "C",
                    "derived": {"name": "εε₀S", "expr": "k", "unit": "pF·mm"}},
    "induksiya": {"x": "N", "y": "Maks"},
    "qiya_tekislik": {"x": "α", "y": "FIK"},
    "otilgan_jism": {"x": "α", "y": "L o'lch"},
    "rezerford": {"x": "v", "y": "r_min"},
    "kepler": {"x": "a", "xp": 3, "y": "T²/a³"},
    "impuls": {"x": "p", "y": "p′",
               "derived": {"name": "p′/p", "expr": "k", "unit": "", "theory": 1}},
    "yoruglik_sinishi": {"x": "sinβ", "y": "sinα",
                         "derived": {"name": "n₂/n₁", "expr": "k", "unit": "", "theory_col": "n₂/n₁"}},
    "linza": {"x": "d", "xp": -1, "y": "f", "yp": -1,
              "derived": {"name": "F", "expr": "1/b", "unit": "cm", "theory_col": "F"}},
    "fotoeffekt": {"x": "U", "y": "I o'lch"},
    "radioaktiv_yemirilish": {"x": "t", "y": "N"},
}


def column_key(label: str) -> str:
    """'L (m)' → 'L', "I o'lch. (nA)" → "I o'lch.", 'k' → 'k'"""
    return re.sub(r"\s*\([^()]*\)\s*$", "", label).strip() or label


def column_unit(label: str) -> str:
    m = re.search(r"\(([^()]*)\)\s*$", label)
    return m.group(1) if m else ""


def js_string(lit: str) -> str:
    return ast.literal_eval(lit)


def strip_tags(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


class Command(BaseCommand):
    help = "Statik saytdagi modellar katalogini bazaga import qiladi"

    def add_arguments(self, parser):
        parser.add_argument("--frontend", default=str(settings.FRONTEND_DIR))

    def handle(self, *args, **opts):
        root = Path(opts["frontend"])
        index = root / "index.html"
        if not index.exists():
            raise CommandError(f"{index} topilmadi")
        ru = self._load_ru(root / "i18n-ru.js")
        teacher = self._load_teacher(root / "model-tools.js")
        cards = self._parse_index(index.read_text(encoding="utf-8"))
        with transaction.atomic():
            for card in cards:
                self._import_one(root, card, ru, teacher)
        self.stdout.write(self.style.SUCCESS(f"{len(cards)} ta model import qilindi"))

    # ---------- manbalarni o'qish ----------
    def _load_ru(self, path: Path) -> dict:
        if not path.exists():
            return {}
        text = path.read_text(encoding="utf-8")
        start = text.index("{", text.index("window.FIZIKA_RU"))
        end = text.rindex("}")
        return json.loads(text[start:end + 1])

    def _load_teacher(self, path: Path) -> dict:
        text = path.read_text(encoding="utf-8")
        m = re.search(r"var TEACHER = (\{.*?\n    \});", text, re.S)
        if not m:
            return {}
        # JS obyekt literal (bir tirnoqli satrlar, \' bilan) Python literaliga mos keladi
        return ast.literal_eval(m.group(1))

    def _parse_index(self, text: str) -> list[dict]:
        cards = []
        for m in re.finditer(r'<a class="sim" (.*?)</a>', text, re.S):
            block = m.group(0)
            attr = dict(re.findall(r'data-([a-z]+)="([^"]*)"', block))
            href = re.search(r'href="(modellar/(\w+)_model\.html)"', block)
            cards.append({
                "page_path": href.group(1),
                "slug": href.group(2),
                "category": attr["cat"],
                "grade": int(attr["grade"]),
                "order": int(attr.get("order", 0)),
                "title": strip_tags(re.search(r'sim__title">(.*?)</span>', block, re.S).group(1)),
                "description": strip_tags(re.search(r'sim__desc">(.*?)</span>', block, re.S).group(1)),
                "thumbnail": re.search(r'<img src="([^"]+)"', block).group(1),
                "icon": strip_tags(re.search(r'tag--cat">(.*?)</span>', block, re.S).group(1)).split(" ")[0],
            })
        if not cards:
            raise CommandError("index.html da model kartalari topilmadi")
        return cards

    def _parse_page(self, path: Path) -> tuple[list[str], list[dict]]:
        text = path.read_text(encoding="utf-8")
        task = re.search(r'class="task-card".*?<ol>(.*?)</ol>', text, re.S)
        steps = [li.strip() for li in re.findall(r"<li>(.*?)</li>", task.group(1), re.S)] if task else []
        steps = [re.sub(r"\s+", " ", s) for s in steps]
        fields = re.search(r"window\.labFields\s*=\s*\[(.*?)\n\s*\];", text, re.S)
        labels = []
        if fields:
            labels = [js_string(x) for x in re.findall(
                r"label:\s*(\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')", fields.group(1))]
        columns = [{"key": column_key(lb), "label": lb, "unit": column_unit(lb),
                    "type": "text" if column_key(lb) in TEXT_COLUMNS else "number"} for lb in labels]
        return steps, columns

    # ---------- yozish ----------
    def _import_one(self, root: Path, card: dict, ru: dict, teacher: dict):
        slug = card["slug"]
        steps, columns = self._parse_page(root / card["page_path"])
        sim, created = Simulation.objects.update_or_create(
            slug=slug,
            defaults={
                "page_path": card["page_path"], "category": card["category"], "grade": card["grade"],
                "order": card["order"], "thumbnail": card["thumbnail"], "icon": card["icon"],
                "title_uz": card["title"], "title_ru": ru.get(card["title"], ""),
                "description_uz": card["description"], "description_ru": ru.get(card["description"], ""),
                "analysis": ANALYSIS.get(slug, {}),
            },
        )
        sim.tasks.all().delete()
        SimulationTask.objects.bulk_create([
            SimulationTask(simulation=sim, step_no=i + 1, text_uz=s, text_ru=ru.get(strip_tags(s), ""))
            for i, s in enumerate(steps)
        ])
        sim.expected.all().delete()
        SimulationExpected.objects.bulk_create([
            SimulationExpected(simulation=sim, order=i, text_uz=t, text_ru=ru.get(t, ""))
            for i, t in enumerate(teacher.get(card["page_path"].split("/")[-1], []))
        ])
        current = sim.current_schema
        if columns and (current is None or current.columns != columns):
            LabSchema.objects.create(simulation=sim, version=(current.version + 1 if current else 1),
                                     columns=columns)
        self.stdout.write(f"  {'+' if created else '~'} {slug}: {len(steps)} qadam, {len(columns)} ustun")

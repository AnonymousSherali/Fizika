"""
dars_ishlanmalar/index.html dagi 22 ta dars ishlanmani bazaga ko'chiradi (FT-7.1).
Fayllar statik saytda qoladi — bazada ularning yo'li saqlanadi. Qayta ishga tushirish xavfsiz.

    python manage.py import_lesson_plans [--frontend /yo'l/saytga]
"""
import html
import json
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.content.models import LessonPlan
from apps.simulations.models import Simulation


def text(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


class Command(BaseCommand):
    help = "Statik saytdagi dars ishlanmalarni bazaga import qiladi"

    def add_arguments(self, parser):
        parser.add_argument("--frontend", default=str(settings.FRONTEND_DIR))

    def handle(self, *args, **opts):
        root = Path(opts["frontend"])
        page = root / "dars_ishlanmalar" / "index.html"
        if not page.exists():
            raise CommandError(f"{page} topilmadi")
        src = page.read_text(encoding="utf-8")
        ru = {}
        rp = root / "i18n-ru.js"
        if rp.exists():
            t = rp.read_text(encoding="utf-8")
            ru = json.loads(t[t.index("{", t.index("window.FIZIKA_RU")):t.rindex("}") + 1])
        n = 0
        for section in re.finditer(r'id="sinf(10|11)">(.*?)(?=<div class="section"|<!-- =+ 11|\Z)', src, re.S):
            grade = int(section.group(1))
            for i, m in enumerate(re.finditer(r'<div class="card">(.*?)</div>\s*</div>', section.group(2), re.S)):
                c = m.group(1)
                title = text(re.search(r"<h3>(.*?)</h3>", c, re.S).group(1))
                pdf = re.search(r'href="([^"]+\.pdf)"', c)
                docx = re.search(r'href="([^"]+\.docx)"', c)
                model = re.search(r'href="\.\./modellar/(\w+)_model\.html"', c)
                tag = re.search(r'type-tag">(.*?)</span>', c, re.S)
                icon = re.search(r'card-icon"[^>]*>(.*?)</div>', c, re.S)
                LessonPlan.objects.update_or_create(
                    static_pdf=f"dars_ishlanmalar/{pdf.group(1)}" if pdf else "",
                    defaults={
                        "title_uz": title, "title_ru": ru.get(title, ""), "grade": grade, "order": i,
                        "lesson_type": text(tag.group(1)) if tag else "", "icon": text(icon.group(1)) if icon else "",
                        "static_docx": f"dars_ishlanmalar/{docx.group(1)}" if docx else "",
                        "simulation": Simulation.objects.filter(slug=model.group(1)).first() if model else None,
                        "status": LessonPlan.Status.PUBLISHED,
                    },
                )
                n += 1
        self.stdout.write(self.style.SUCCESS(f"{n} ta dars ishlanma import qilindi"))

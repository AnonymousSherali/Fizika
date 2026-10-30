"""Bazadagi tarjimalardan i18n-ru.js faylini qayta yozadi (admin panelda tahrirlangandan keyin).

    python manage.py export_i18n [--frontend /yo'l/saytga]
"""
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.content.views import build_ru_js


class Command(BaseCommand):
    help = "Translation jadvali → i18n-ru.js"

    def add_arguments(self, parser):
        parser.add_argument("--frontend", default=str(settings.FRONTEND_DIR))

    def handle(self, *args, **opts):
        p = Path(opts["frontend"]) / "i18n-ru.js"
        p.write_text(build_ru_js(), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"{p} yozildi"))

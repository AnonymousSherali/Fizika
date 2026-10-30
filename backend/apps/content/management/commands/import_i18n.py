"""i18n-ru.js lug'atini bazaga ko'chiradi (FT-7.6). Mavjud tarjimalar yangilanadi.

    python manage.py import_i18n [--frontend /yo'l/saytga]
"""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.content.models import Translation


class Command(BaseCommand):
    help = "i18n-ru.js → Translation jadvali"

    def add_arguments(self, parser):
        parser.add_argument("--frontend", default=str(settings.FRONTEND_DIR))

    def handle(self, *args, **opts):
        p = Path(opts["frontend"]) / "i18n-ru.js"
        if not p.exists():
            raise CommandError(f"{p} topilmadi")
        t = p.read_text(encoding="utf-8")
        data = json.loads(t[t.index("{", t.index("window.FIZIKA_RU")):t.rindex("}") + 1])
        existing = dict(Translation.objects.values_list("key", "ru"))
        new = [Translation(key=k, ru=v) for k, v in data.items() if k not in existing]
        Translation.objects.bulk_create(new, batch_size=500)
        upd = 0
        for k, v in data.items():
            if k in existing and existing[k] != v:
                Translation.objects.filter(key=k).update(ru=v)
                upd += 1
        self.stdout.write(self.style.SUCCESS(f"{len(new)} ta yangi, {upd} ta yangilangan (jami {len(data)})"))

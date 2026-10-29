"""Fon vazifalari (TZ 4.3): hisobni o'chirish, bildirishnomalar, eksport."""
import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

app = Celery("fizika")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    # FT-1.7: o'chirish so'ralgan hisoblar 30 kundan keyin tozalanadi
    "purge-deleted-accounts": {
        "task": "apps.accounts.tasks.purge_deleted_accounts",
        "schedule": crontab(hour=3, minute=17),
    },
    # FT-5.8: muddatga 24 soat va 1 soat qolganda eslatma
    "deadline-reminders": {
        "task": "apps.notifications.tasks.send_deadline_reminders",
        "schedule": crontab(minute="*/15"),
    },
}

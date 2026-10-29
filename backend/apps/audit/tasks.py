from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .models import AuditLog


@shared_task
def purge_old_audit() -> int:
    """FT-11.3: 1 yildan eski audit yozuvlari o'chiriladi (yagona ruxsat etilgan o'chirish)."""
    limit = timezone.now() - timedelta(days=settings.AUDIT_RETENTION_DAYS)
    n, _ = AuditLog.objects.filter(created_at__lt=limit).delete()
    return n

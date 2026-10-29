from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .models import User


@shared_task
def purge_deleted_accounts() -> int:
    """FT-1.7: o'chirish so'ralganiga 30 kun bo'lgan hisoblar butunlay o'chiriladi.
    Shaxsiy ma'lumotlar bilan birga jurnallar ham o'chadi (CASCADE)."""
    limit = timezone.now() - timedelta(days=settings.ACCOUNT_DELETION_GRACE_DAYS)
    qs = User.objects.filter(deletion_requested_at__lte=limit, is_superuser=False)
    count = qs.count()
    qs.delete()
    return count

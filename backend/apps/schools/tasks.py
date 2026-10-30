"""FT-2.6: o'quv yili tugagach sinflar avtomatik arxivga o'tadi (o'chirilmaydi, natijalar saqlanadi)."""
from celery import shared_task
from django.utils import timezone

from apps.audit.models import AuditLog

from .models import Classroom, academic_year_end


@shared_task
def archive_finished_classrooms() -> int:
    today = timezone.localdate()
    done = 0
    for c in Classroom.objects.filter(is_archived=False).only("id", "academic_year", "name"):
        end = academic_year_end(c.academic_year)
        if end and today >= end:
            # Qo'shilish kodi ham o'chiriladi — arxivdagi sinfga yangi o'quvchi qo'shilmaydi
            Classroom.objects.filter(pk=c.pk).update(is_archived=True, join_code=None, updated_at=timezone.now())
            AuditLog.objects.create(action="classroom.auto_archive", object_type="schools.classroom",
                                    object_id=str(c.pk), after={"academic_year": c.academic_year})
            done += 1
    return done

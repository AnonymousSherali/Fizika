from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Notification


@shared_task
def send_notification_emails(ids):
    """FT-9.1: email kanali (faqat emaili bor va email bildirishnomani yoqqan foydalanuvchilar)."""
    sent = 0
    for n in Notification.objects.filter(id__in=ids, emailed_at__isnull=True).select_related("user"):
        if not (n.user.email and n.user.notify_email):
            continue
        link = settings.SITE_URL.rstrip("/") + "/" + n.url if n.url else settings.SITE_URL
        send_mail(f"Fizika 10–11: {n.title}", f"{n.body}\n\n{link}".strip(), None, [n.user.email],
                  fail_silently=True)
        n.emailed_at = timezone.now()
        n.save(update_fields=["emailed_at"])
        sent += 1
    return sent


@shared_task
def send_deadline_reminders():
    """FT-5.8: muddatga 24 soat va 1 soat qolganda — hali topshirmagan o'quvchilarga eslatma."""
    from apps.assignments.models import Assignment, Submission

    from .services import assignment_url, notify, students_of

    now = timezone.now()
    count = 0
    for hours in (24, 1):
        window = Assignment.objects.filter(due_at__gt=now, due_at__lte=now + timedelta(hours=hours))
        for a in window.prefetch_related("classrooms"):
            done = set(Submission.objects.filter(
                assignment=a, status__in=[Submission.Status.SUBMITTED, Submission.Status.GRADED]
            ).values_list("student_id", flat=True))
            pending = [u for u in students_of(a) if u.id not in done]
            left = "1 soat" if hours == 1 else "1 kun"
            count += len(notify(pending, Notification.Type.DEADLINE, f"Muddatga {left} qoldi: {a.title}",
                                f"Muddat: {timezone.localtime(a.due_at):%d.%m.%Y %H:%M}", assignment_url(a),
                                dedupe_key=f"due{hours}:{a.id}"))
    return count

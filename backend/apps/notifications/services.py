"""Bildirishnoma yaratish (FT-9.1 – FT-9.3). Email Celery orqali fonda yuboriladi."""
from django.db import IntegrityError, transaction

from .models import Notification


def notify(users, type_, title, body="", url="", dedupe_key=""):
    """users — bitta foydalanuvchi yoki ro'yxat. Takroriy (dedupe_key) yozuvlar jim o'tkaziladi."""
    if not isinstance(users, list | tuple | set):
        users = [users]
    created = []
    for u in users:
        if u is None or not u.is_active:
            continue
        if dedupe_key and Notification.objects.filter(user=u, dedupe_key=dedupe_key).exists():
            continue
        try:
            with transaction.atomic():
                n = Notification.objects.create(user=u, type=type_, title=title[:200], body=body, url=url,
                                                dedupe_key=dedupe_key)
        except IntegrityError:  # parallel yaratilgan bo'lsa
            continue
        created.append(n)
    if created:
        ids = [n.id for n in created if n.user.email and n.user.notify_email]
        if ids:
            from .tasks import send_notification_emails

            transaction.on_commit(lambda: send_notification_emails.delay(ids))
    return created


# ---------- Hodisalar (FT-9.2) ----------
def students_of(assignment):
    from apps.accounts.models import User
    from apps.schools.models import ClassroomMember

    return list(User.objects.filter(
        memberships__classroom__in=assignment.classrooms.all(), memberships__role=ClassroomMember.Role.STUDENT,
        is_active=True).distinct())


def assignment_url(assignment):
    if assignment.type == "test":
        return f"testlar/nazorat.html?topshiriq={assignment.id}"
    page = assignment.simulation.page_path if assignment.simulation_id else "oquvchi/index.html"
    return f"{page}?topshiriq={assignment.id}"


def on_assignment_created(assignment):
    due = f" Muddat: {assignment.due_at:%d.%m.%Y %H:%M}." if assignment.due_at else ""
    kind = "Laboratoriya ishi" if assignment.type == "lab" else "Test"
    notify(students_of(assignment), Notification.Type.NEW_ASSIGNMENT, f"Yangi topshiriq: {assignment.title}",
           f"{kind}.{due}", assignment_url(assignment), dedupe_key=f"new:{assignment.id}")


def on_graded(submission):
    notify(submission.student, Notification.Type.GRADED, f"Baho qo'yildi: {submission.assignment.title}",
           f"Baho: {submission.grade:g}." + (f" Izoh: {submission.teacher_comment}" if submission.teacher_comment else ""),
           "oquvchi/index.html")


def on_returned(submission):
    notify(submission.student, Notification.Type.RETURNED, f"Qayta topshiring: {submission.assignment.title}",
           submission.teacher_comment, assignment_url(submission.assignment))


def on_submitted(submission):
    a = submission.assignment
    name = f"{submission.student.last_name} {submission.student.first_name}".strip()
    notify(a.teacher, Notification.Type.SUBMITTED, f"{name} ishni topshirdi: {a.title}",
           "Tekshirib baholang.", f"oqituvchi/index.html#javob/{submission.id}")


def on_student_joined(classroom, student):
    from apps.schools.models import ClassroomMember

    teachers = [m.user for m in classroom.memberships.select_related("user")
                if m.role in (ClassroomMember.Role.TEACHER, ClassroomMember.Role.ASSISTANT)]
    name = f"{student.last_name} {student.first_name}".strip()
    notify(teachers, Notification.Type.NEW_STUDENT, f"{classroom.name} sinfiga yangi o'quvchi: {name}",
           "", f"oqituvchi/index.html#sinf/{classroom.id}")

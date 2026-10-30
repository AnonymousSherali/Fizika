"""Admin panel (Unfold): yon menyu nishonlari, muhit belgisi va bosh sahifa statistikasi."""
import json
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.urls import reverse
from django.utils import timezone


# ---------- Yon menyudagi nishonlar (moderatsiya kutayotganlar soni) ----------
def _count(key, fn):
    n = cache.get_or_set(f"admin-badge:{key}", fn, 60)
    return str(n) if n else None


def badge_questions(request):
    from apps.quizzes.models import Question, Status
    return _count("q", lambda: Question.objects.filter(status=Status.DRAFT).count())


def badge_problems(request):
    from apps.quizzes.models import Problem, Status
    return _count("p", lambda: Problem.objects.filter(status=Status.DRAFT).count())


def badge_lesson_plans(request):
    from apps.content.models import LessonPlan
    return _count("lp", lambda: LessonPlan.objects.filter(status=LessonPlan.Status.REVIEW).count())


def badge_schools(request):
    from apps.schools.models import School
    return _count("s", lambda: School.objects.filter(is_verified=False).count())


def environment(request):
    """Sarlavhadagi belgi: production bo'lmasa ogohlantiradi (sinov bazasida ishlayotganini bilish uchun)."""
    if settings.DEBUG:
        return ["Sinov (DEBUG)", "warning"]
    if not settings.ADMIN_2FA:
        return ["2FA o'chirilgan", "danger"]
    return None


def superuser_only(request):
    return request.user.is_superuser


# ---------- Bosh sahifa ----------
def _changelist(name, **params):
    url = reverse(f"admin:{name}_changelist")
    return url + ("?" + "&".join(f"{k}={v}" for k, v in params.items()) if params else "")


def _activity(days=30):
    """So'nggi `days` kun: kunlik yakunlangan testlar va yangi laboratoriya jurnallari."""
    from apps.labs.models import LabJournal
    from apps.quizzes.models import Attempt

    since = (timezone.now() - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    tests = dict(Attempt.objects.filter(finished_at__gte=since).annotate(d=TruncDate("finished_at"))
                 .values("d").annotate(n=Count("id")).values_list("d", "n"))
    labs = dict(LabJournal.objects.filter(created_at__gte=since).annotate(d=TruncDate("created_at"))
                .values("d").annotate(n=Count("id")).values_list("d", "n"))
    dates = [(since + timedelta(days=i)).date() for i in range(days)]
    return {
        "labels": [d.strftime("%d.%m") for d in dates],
        "datasets": [
            {"label": "Testlar", "data": [tests.get(d, 0) for d in dates],
             "backgroundColor": "var(--color-primary-600)"},
            {"label": "Laboratoriya jurnallari", "data": [labs.get(d, 0) for d in dates],
             "backgroundColor": "var(--color-primary-300)"},
        ],
    }


def _dashboard_data():
    from apps.accounts.models import Role, User
    from apps.analytics.services import platform_stats
    from apps.audit.models import AuditLog
    from apps.content.models import LessonPlan
    from apps.quizzes.models import Problem, Question, Status
    from apps.schools.models import Classroom, Region, School

    st = platform_stats()
    users = st["users"]
    kpi = [
        {"title": "O'quvchilar", "value": users.get(Role.STUDENT, 0), "icon": "school",
         "href": _changelist("accounts_user", role__exact=Role.STUDENT)},
        {"title": "O'qituvchilar", "value": users.get(Role.TEACHER, 0), "icon": "co_present",
         "href": _changelist("accounts_user", role__exact=Role.TEACHER)},
        {"title": "Maktablar", "value": School.objects.count(), "icon": "domain",
         "href": _changelist("schools_school")},
        {"title": "Faol sinflar", "value": Classroom.objects.filter(is_archived=False).count(), "icon": "groups",
         "href": _changelist("schools_classroom", is_archived__exact=0)},
        {"title": "7 kunda faol", "value": st["active_7d"], "icon": "trending_up",
         "note": f"30 kunda: {st['active_30d']}"},
        {"title": "Laboratoriya jurnallari", "value": sum(r["n"] for r in st["labs_by_simulation"]),
         "icon": "science", "href": _changelist("labs_labjournal")},
        {"title": "Yakunlangan testlar", "value": st["attempts"], "icon": "quiz",
         "href": _changelist("quizzes_attempt")},
        {"title": "Topshiriqlar", "value": st["assignments"], "icon": "assignment",
         "href": _changelist("assignments_assignment")},
    ]
    moderation = [
        {"title": "Savollar (qoralama)", "icon": "help",
         "value": Question.objects.filter(status=Status.DRAFT).count(),
         "href": _changelist("quizzes_question", status__exact=Status.DRAFT)},
        {"title": "Masalalar (qoralama)", "icon": "calculate",
         "value": Problem.objects.filter(status=Status.DRAFT).count(),
         "href": _changelist("quizzes_problem", status__exact=Status.DRAFT)},
        {"title": "Dars ishlanmalar (moderatsiyada)", "icon": "description",
         "value": LessonPlan.objects.filter(status=LessonPlan.Status.REVIEW).count(),
         "href": _changelist("content_lessonplan", status__exact=LessonPlan.Status.REVIEW)},
        {"title": "Tasdiqlanmagan maktablar", "icon": "domain_disabled",
         "value": School.objects.filter(is_verified=False).count(),
         "href": _changelist("schools_school", is_verified__exact=0)},
        {"title": "Tasdiqlanmagan o'qituvchilar", "icon": "person_alert",
         "value": User.objects.filter(role=Role.TEACHER, is_verified=False, is_active=True).count(),
         "href": _changelist("accounts_user", role__exact=Role.TEACHER, is_verified__exact=0)},
    ]
    total = sum(r["n"] for r in st["by_region"]) or 1
    labels = dict(Region.choices)
    regions = [{"title": labels.get(r["school__region"], r["school__region"]), "count": r["n"],
                "percent": round(r["n"] / total * 100)} for r in st["by_region"][:14]]
    sims = {"headers": ["Model", "Jurnallar"],
            "rows": [[r["simulation__title_uz"], r["n"]] for r in st["labs_by_simulation"][:8]]}
    audit = {"headers": ["Vaqt", "Kim", "Amal"],
             "rows": [[timezone.localtime(a.created_at).strftime("%d.%m %H:%M"),
                       (a.actor.get_full_name() or a.actor.username) if a.actor else "—", a.action_label]
                      for a in AuditLog.objects.select_related("actor").order_by("-created_at")[:8]]}
    return {"kpi": kpi, "moderation": moderation, "regions": regions, "sims": sims, "audit": audit,
            "activity": json.dumps(_activity())}


def dashboard_callback(request, context):
    # Hisoblar yengil, lekin bosh sahifa tez-tez ochiladi — 2 daqiqa keshlanadi
    context.update(cache.get_or_set("admin-dashboard", _dashboard_data, 120))
    return context

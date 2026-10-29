"""Statistika hisoblari (FT-8.1 – FT-8.5). Natijalar keshlanadi; kesh kaliti sinfdagi oxirgi o'zgarish
vaqtini o'z ichiga oladi — yangi baho/urinish bo'lsa kesh o'z-o'zidan yangilanadi."""
from collections import defaultdict
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Avg, Count, Max, Q
from django.utils import timezone

from apps.accounts.models import User
from apps.assignments.models import Assignment, Submission
from apps.labs.models import LabJournal
from apps.quizzes.models import Attempt, Topic
from apps.schools.models import ClassroomMember


def class_students(classroom):
    return User.objects.filter(memberships__classroom=classroom,
                               memberships__role=ClassroomMember.Role.STUDENT).order_by("last_name", "first_name")


def _stamp(classroom, student_ids):
    s = Submission.objects.filter(assignment__classrooms=classroom).aggregate(m=Max("updated_at"))["m"]
    a = Attempt.objects.filter(user_id__in=student_ids).aggregate(m=Max("finished_at"))["m"]
    n = len(student_ids)
    return f"{s and s.timestamp()}:{a and a.timestamp()}:{n}"


def cached(prefix, classroom, builder):
    ids = list(class_students(classroom).values_list("id", flat=True))
    key = f"an:{prefix}:{classroom.id}:{_stamp(classroom, ids)}"
    data = cache.get(key)
    if data is None:
        data = builder(ids)
        cache.set(key, data, settings.ANALYTICS_CACHE_SECONDS)
    return data


def topic_mastery(attempts) -> dict:
    """Urinishlardagi mavzular tahlilini yig'adi: {topic_key: {"ok": .., "all": ..}}"""
    agg = defaultdict(lambda: {"ok": 0, "all": 0})
    for a in attempts:
        for b in (a.topic_breakdown or {}).values():
            k = b.get("topic")
            if k:
                agg[k]["ok"] += b["ok"]
                agg[k]["all"] += b["all"]
    return agg


def _topics_list(agg):
    titles = dict(Topic.objects.values_list("key", "title_uz"))
    order = {k: i for i, k in enumerate(Topic.objects.order_by("order").values_list("key", flat=True))}
    out = [{"key": k, "title": titles.get(k, k), "ok": v["ok"], "all": v["all"],
            "percent": round(v["ok"] / v["all"] * 100, 1) if v["all"] else None} for k, v in agg.items()]
    return sorted(out, key=lambda x: order.get(x["key"], 99))


def assignment_rows(classroom):
    rows = []
    for a in Assignment.objects.filter(classrooms=classroom).order_by("-created_at"):
        subs = a.submissions.filter(student__memberships__classroom=classroom).distinct()
        agg = subs.aggregate(
            submitted=Count("id", filter=Q(status__in=[Submission.Status.SUBMITTED, Submission.Status.GRADED])),
            graded=Count("id", filter=Q(status=Submission.Status.GRADED)),
            avg=Avg("grade", filter=Q(status=Submission.Status.GRADED)),
        )
        rows.append({"id": str(a.id), "title": a.title, "type": a.type, "due_at": a.due_at, "scale": a.grading_scale,
                     "submitted": agg["submitted"], "graded": agg["graded"],
                     "avg_grade": round(agg["avg"], 2) if agg["avg"] is not None else None})
    return rows


def classroom_summary(classroom):
    def build(ids):
        week = timezone.now() - timedelta(days=7)
        attempts = list(Attempt.objects.filter(user_id__in=ids, finished_at__isnull=False))
        labs_7d = LabJournal.objects.filter(user_id__in=ids, updated_at__gte=week)
        att_7d = [a for a in attempts if a.finished_at >= week]
        active = set(labs_7d.values_list("user_id", flat=True)) | {a.user_id for a in att_7d}
        return {
            "classroom": {"id": classroom.id, "name": classroom.name, "grade": classroom.grade,
                          "academic_year": classroom.academic_year},
            "students": len(ids),
            "assignments": assignment_rows(classroom),
            "avg_test_percent": round(sum(a.percent for a in attempts) / len(attempts), 1) if attempts else None,
            "topics": _topics_list(topic_mastery(attempts)),
            "activity_7d": {"labs": labs_7d.count(), "tests": len(att_7d), "active_students": len(active)},
        }

    return cached("sum", classroom, build)


def classroom_heatmap(classroom):
    """FT-8.1: o'quvchi × mavzu matritsasi (test natijalari bo'yicha to'g'ri javoblar %)."""
    def build(ids):
        students = list(class_students(classroom))
        by_user = defaultdict(list)
        for a in Attempt.objects.filter(user_id__in=ids, finished_at__isnull=False):
            by_user[a.user_id].append(a)
        all_agg = topic_mastery([a for lst in by_user.values() for a in lst])
        topics = [{"key": t["key"], "title": t["title"]} for t in _topics_list(all_agg)]
        grades = Submission.objects.filter(assignment__classrooms=classroom, student_id__in=ids,
                                           status=Submission.Status.GRADED)
        avg5 = dict(grades.filter(assignment__grading_scale=5).values("student_id")
                    .annotate(a=Avg("grade")).values_list("student_id", "a"))
        done = dict(Submission.objects.filter(assignment__classrooms=classroom, student_id__in=ids,
                                              status__in=[Submission.Status.SUBMITTED, Submission.Status.GRADED])
                    .values("student_id").annotate(n=Count("id")).values_list("student_id", "n"))
        rows = []
        for s in students:
            agg = topic_mastery(by_user.get(s.id, []))
            rows.append({
                "id": str(s.id), "name": f"{s.last_name} {s.first_name}".strip(), "username": s.username,
                "cells": {k: (round(v["ok"] / v["all"] * 100) if v["all"] else None) for k, v in agg.items()},
                "avg_grade": round(avg5[s.id], 2) if s.id in avg5 else None,
                "submitted": done.get(s.id, 0), "tests": len(by_user.get(s.id, [])),
            })
        return {"topics": topics, "students": rows}

    return cached("heat", classroom, build)


def student_card(student):
    """FT-8.2: o'quvchi kartasi — topshiriqlar, test dinamikasi, zaif mavzular."""
    from apps.assignments.services import assignments_for_student, student_status

    subs = {s.assignment_id: s for s in Submission.objects.filter(student=student)}
    assignments = []
    for a in assignments_for_student(student).order_by("-created_at"):
        s = subs.get(a.id)
        assignments.append({"id": str(a.id), "title": a.title, "type": a.type, "due_at": a.due_at,
                            "status": student_status(a, s), "grade": s.grade if s else None,
                            "scale": a.grading_scale, "is_late": bool(s and s.is_late)})
    attempts = list(Attempt.objects.filter(user=student, finished_at__isnull=False)
                    .select_related("assignment").order_by("finished_at"))
    topics = _topics_list(topic_mastery(attempts))
    weak = sorted([t for t in topics if t["percent"] is not None and t["percent"] < 60], key=lambda t: t["percent"])
    labs = LabJournal.objects.filter(user=student).values("simulation__title_uz").annotate(n=Count("id"))
    grades = [x["grade"] for x in assignments if x["grade"] is not None and x["scale"] == 5]
    return {
        "student": {"id": str(student.id), "name": f"{student.last_name} {student.first_name}".strip(),
                    "username": student.username, "last_login": student.last_login},
        "avg_grade": round(sum(grades) / len(grades), 2) if grades else None,
        "assignments": assignments,
        "attempts": [{"id": str(a.id), "finished_at": a.finished_at, "percent": a.percent, "grade": a.grade,
                      "assignment": a.assignment.title if a.assignment else None} for a in attempts],
        "topics": topics,
        "weak_topics": weak,
        "labs": [{"simulation": x["simulation__title_uz"], "count": x["n"]} for x in labs],
    }


def platform_stats():
    """FT-8.4: administrator uchun umumiy ko'rsatkichlar."""
    now = timezone.now()
    users = User.objects.filter(is_active=True)
    by_role = dict(users.values("role").annotate(n=Count("id")).values_list("role", "n"))
    return {
        "users": by_role,
        "active_7d": users.filter(last_login__gte=now - timedelta(days=7)).count(),
        "active_30d": users.filter(last_login__gte=now - timedelta(days=30)).count(),
        "labs_by_simulation": list(LabJournal.objects.values("simulation__slug", "simulation__title_uz")
                                   .annotate(n=Count("id")).order_by("-n")),
        "attempts": Attempt.objects.filter(finished_at__isnull=False).count(),
        "assignments": Assignment.objects.count(),
        "by_region": list(users.exclude(school__isnull=True).values("school__region")
                          .annotate(n=Count("id")).order_by("-n")),
    }

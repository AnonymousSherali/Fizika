"""Topshiriq mantiqi: ruxsatlar, avtomatik dastlabki baho, testni boshlash va yakunlash."""
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.core.exceptions import Conflict
from apps.quizzes import services as quiz
from apps.schools.models import ClassroomMember

from .models import Assignment, Submission

STAFF = (ClassroomMember.Role.TEACHER, ClassroomMember.Role.ASSISTANT)


def assignments_for_student(user):
    classes = ClassroomMember.objects.filter(user=user, role=ClassroomMember.Role.STUDENT).values("classroom")
    return Assignment.objects.filter(classrooms__in=classes).distinct()


def assignments_for_teacher(user):
    """O'qituvchi yaratgan yoki o'zi o'qituvchi bo'lgan sinflarga berilgan topshiriqlar."""
    if user.is_platform_admin:
        return Assignment.objects.all()
    classes = ClassroomMember.objects.filter(user=user, role__in=STAFF).values("classroom")
    return Assignment.objects.filter(Q(teacher=user) | Q(classrooms__in=classes)).distinct()


def visible_classrooms(a: Assignment, user):
    """Topshiriqning shu o'qituvchi ko'ra oladigan sinflari: muallif va admin — hammasi; boshqa sinf
    o'qituvchisi (masalan, 10-A yordamchisi) — faqat o'z sinflari (11-B o'quvchilarini ko'rmaydi/baholamaydi)."""
    if user is None or user.is_platform_admin or a.teacher_id == user.id:
        return a.classrooms.all()
    mine = ClassroomMember.objects.filter(user=user, role__in=STAFF).values("classroom")
    return a.classrooms.filter(id__in=mine)


def can_staff_see_student(a: Assignment, user, student_id) -> bool:
    return ClassroomMember.objects.filter(classroom__in=visible_classrooms(a, user), user_id=student_id,
                                          role=ClassroomMember.Role.STUDENT).exists()


def get_for_student(assignment_id, user) -> Assignment:
    return get_object_or_404(assignments_for_student(user), pk=assignment_id)


def check_can_work(assignment: Assignment):
    if not assignment.is_open:
        raise PermissionDenied("Topshiriq hali boshlanmagan")
    if assignment.is_past_due and not assignment.allow_late:
        raise PermissionDenied("Topshiriq muddati o'tgan")


def to_scale(percent: float, assignment: Assignment) -> float:
    if assignment.grading_scale == Assignment.Scale.HUNDRED:
        return round(percent)
    return float(quiz.grade_from_percent(percent))


# ---------- Laboratoriya: avtomatik dastlabki baho (FT-5.7) ----------
def auto_check_lab(assignment: Assignment, rows: list, analysis: dict | None, conclusion: str) -> dict:
    checks = []
    checks.append({"key": "rows", "ok": len(rows) >= assignment.min_rows,
                   "text": f"Kamida {assignment.min_rows} ta o'lchov (bor: {len(rows)})"})
    fit = (analysis or {}).get("fit")
    if assignment.require_graph:
        checks.append({"key": "r2", "ok": bool(fit) and fit["r2"] >= 0.98,
                       "text": "Grafik chiziqli: R² ≥ 0,98" + (f" (bor: {fit['r2']:.4f})" if fit else " (grafik yo'q)")})
    derived = (analysis or {}).get("derived") or {}
    if "error_pct" in derived:
        checks.append({"key": "error", "ok": derived["error_pct"] <= 5,
                       "text": f"Natija nazariyadan ≤ 5% farq qiladi (bor: {derived['error_pct']:.2f}%)"})
    if assignment.require_conclusion:
        checks.append({"key": "conclusion", "ok": len(conclusion.strip()) >= 20,
                       "text": "Xulosa yozilgan (kamida 20 belgi)"})
    failed = sum(1 for c in checks if not c["ok"])
    grade5 = max(2, 5 - failed)
    percent = {5: 100, 4: 80, 3: 65, 2: 40}[grade5]
    return {"checks": checks, "passed": len(checks) - failed, "total": len(checks), "percent": percent}


@transaction.atomic
def submit_lab(assignment: Assignment, student, journal, conclusion: str, image=None) -> Submission:
    check_can_work(assignment)
    if journal.user_id != student.id:
        raise PermissionDenied("Faqat o'z jurnalingizni topshira olasiz")
    if journal.simulation_id != assignment.simulation_id:
        raise ValidationError({"lab_journal_id": ["Jurnal boshqa modelga tegishli"]})
    sub, _ = Submission.objects.select_for_update().get_or_create(assignment=assignment, student=student)
    if sub.status in (Submission.Status.SUBMITTED, Submission.Status.GRADED):
        raise Conflict("Topshiriq allaqachon topshirilgan. O'qituvchi qaytarsa, qayta topshirasiz")
    if len(journal.rows) < assignment.min_rows:
        raise ValidationError({"lab_journal_id": [f"Kamida {assignment.min_rows} ta o'lchov kerak"]})
    if assignment.require_conclusion and len(conclusion.strip()) < 20:
        raise ValidationError({"conclusion": ["Xulosa yozing (kamida 20 belgi)"]})
    from apps.simulations.models import LabSchema

    schema = LabSchema.objects.filter(simulation=journal.simulation, version=journal.schema_version).first()
    sub.lab_journal = journal
    sub.lab_snapshot = {"columns": schema.columns if schema else [], "rows": journal.rows,
                        "graph": journal.graph, "analysis": journal.analysis}
    sub.conclusion = conclusion
    if image is not None:
        sub.image = image
    sub.auto_score = auto_check_lab(assignment, journal.rows, journal.analysis, conclusion)
    sub.suggested_grade = to_scale(sub.auto_score["percent"], assignment)
    sub.status = Submission.Status.SUBMITTED
    sub.submitted_at = timezone.now()
    sub.is_late = assignment.is_past_due
    sub.save()
    from apps.notifications.services import on_submitted

    on_submitted(sub)
    return sub


# ---------- Test ----------
@transaction.atomic
def start_test_for(assignment_id, student):
    assignment = get_for_student(assignment_id, student)
    if assignment.type != Assignment.Type.TEST:
        raise ValidationError("Bu topshiriq test emas")
    check_can_work(assignment)
    sub, _ = Submission.objects.select_for_update().get_or_create(assignment=assignment, student=student)
    running = assignment.attempts.filter(user=student, finished_at__isnull=True).first()
    if running and not quiz.is_expired(running):
        return running  # tugallanmagan urinish davom ettiriladi
    if running:
        quiz.finish_attempt(running)
        on_attempt_finished(running)
        sub.refresh_from_db()
    if sub.attempts_used >= assignment.max_attempts:
        raise Conflict("Urinishlar soni tugagan")
    cfg = assignment.quiz_config or {}
    try:
        attempt = quiz.create_attempt(
            student, topics=cfg.get("topics", []), count=cfg.get("count", 20), problems=cfg.get("problems", 0),
            time_limit_min=cfg.get("time_limit_min"), assignment=assignment, show_answers=assignment.show_answers,
        )
    except ValueError as e:
        raise ValidationError(str(e)) from e
    sub.attempts_used += 1
    sub.status = Submission.Status.IN_PROGRESS if sub.status != Submission.Status.GRADED else sub.status
    sub.save(update_fields=["attempts_used", "status", "updated_at"])
    return attempt


@transaction.atomic
def on_attempt_finished(attempt):
    """Test topshirig'i: eng yaxshi urinish bo'yicha avtomatik baho (kechikish jarimasi bilan)."""
    assignment = attempt.assignment
    if not assignment or not attempt.user_id:
        return
    sub, _ = Submission.objects.select_for_update().get_or_create(assignment=assignment, student=attempt.user)

    # Har urinish o'z kechikishi bilan baholanadi, eng yuqori (jarimadan keyingi) natija olinadi:
    # muddatdan keyingi qayta urinish o'z vaqtida olingan yaxshi natijani jarimaga tushirmasin
    def scored(a):
        late = assignment.due_at is not None and a.finished_at > assignment.due_at
        return (a.percent * (1 - assignment.late_penalty_pct / 100) if late else a.percent), late

    from apps.quizzes.models import Attempt

    finished = Attempt.objects.filter(assignment=assignment, user=attempt.user, finished_at__isnull=False)
    best = max(finished, key=lambda a: scored(a)[0], default=attempt)
    percent, late = scored(best)
    sub.attempt = best
    sub.is_late = late
    sub.auto_score = {"percent": round(percent, 1), "raw_percent": best.percent, "score": best.score,
                      "max_score": best.max_score, "late_penalty_pct": assignment.late_penalty_pct if late else 0}
    sub.suggested_grade = to_scale(percent, assignment)
    # O'qituvchi qo'lda qo'ygan baho saqlanadi; aks holda test avtomatik baholanadi
    if sub.graded_by_id is None:
        sub.grade = sub.suggested_grade
        sub.status = Submission.Status.GRADED
        sub.graded_at = timezone.now()
    sub.submitted_at = sub.submitted_at or attempt.finished_at
    sub.save()


def student_status(assignment: Assignment, sub: Submission | None) -> str:
    """FT-5.4: yangi / bajarilmoqda / topshirildi / baholandi / qaytarildi / muddati o'tdi."""
    if sub is None or (sub.status == Submission.Status.IN_PROGRESS and not sub.attempts_used and not sub.lab_journal_id):
        return "overdue" if assignment.is_past_due and not assignment.allow_late else "new"
    if sub.status == Submission.Status.IN_PROGRESS and assignment.is_past_due and not assignment.allow_late:
        return "overdue"
    return sub.status


def build_roster(a: Assignment, user=None) -> list[dict]:
    """O'qituvchi uchun: topshiriq berilgan (va unga ko'rinadigan) sinflardagi har bir o'quvchi va holati."""
    subs = {s.student_id: s for s in a.submissions.select_related("student")}
    rows, seen = [], set()
    members = (ClassroomMember.objects.filter(classroom__in=visible_classrooms(a, user),
                                              role=ClassroomMember.Role.STUDENT)
               .select_related("user", "classroom").order_by("classroom__name", "user__last_name"))
    for m in members:
        if m.user_id in seen:
            continue
        seen.add(m.user_id)
        s = subs.get(m.user_id)
        rows.append({
            "student": {"id": str(m.user_id), "username": m.user.username,
                        "name": f"{m.user.last_name} {m.user.first_name}".strip()},
            "classroom": m.classroom.name, "status": student_status(a, s),
            "submission_id": s.id if s else None, "submitted_at": s.submitted_at if s else None,
            "is_late": bool(s and s.is_late), "suggested_grade": s.suggested_grade if s else None,
            "grade": s.grade if s else None,
        })
    return rows

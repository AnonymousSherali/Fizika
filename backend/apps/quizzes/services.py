"""Test sessiyasi: savollarni tanlash, javobni tekshirish, yakunlash va baholash (FT-6.4 – FT-6.6)."""
import random
from collections import OrderedDict
from datetime import timedelta

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.labs.analysis import safe_eval

from .answers import is_close, parse_answer
from .models import Attempt, AttemptItem, Problem, Question, Status, Topic


def grade_from_percent(pct: float) -> int:
    """Frontenddagi baholash bilan bir xil: ≥90 → 5, ≥75 → 4, ≥60 → 3, aks holda 2."""
    if pct >= 90:
        return 5
    if pct >= 75:
        return 4
    if pct >= 60:
        return 3
    return 2


def _pool(model, topic_ids, author=None):
    q = Q(status=Status.APPROVED)
    if author is not None:  # o'qituvchi o'z topshirig'ida o'zi tuzgan savollarni ham ishlatadi
        q |= Q(author=author) & ~Q(status=Status.ARCHIVED)
    return model.objects.filter(q, topic_id__in=topic_ids)


def _round_robin(items_by_topic: "OrderedDict[int, list]", count: int | None, rng) -> list:
    """Har bir tanlangan mavzudan navbat bilan olinadi — qisqa testda ham barcha mavzu qamraladi."""
    for lst in items_by_topic.values():
        rng.shuffle(lst)
    picked = []
    while any(items_by_topic.values()) and (count is None or len(picked) < count):
        for lst in items_by_topic.values():
            if lst and (count is None or len(picked) < count):
                picked.append(lst.pop())
    rng.shuffle(picked)
    return picked


def select_items(topic_keys, count, problems_count, author=None, seed=None):
    # seed berilmasa — tizimning kriptografik generatori: variantlar tartibini oldindan bilib bo'lmaydi
    # Urug'li tanlov — takrorlanuvchanlik uchun (xavfsizlik emas)
    rng = random.Random(seed) if seed is not None else random.SystemRandom()  # nosec B311
    topics = list(Topic.objects.filter(key__in=topic_keys).order_by("order"))
    if not topics:
        raise ValueError("Mavzu tanlanmagan")
    tids = [t.id for t in topics]
    qmap = OrderedDict((t.id, []) for t in topics)
    for q in _pool(Question, tids, author):
        qmap[q.topic_id].append(q)
    pmap = OrderedDict((t.id, []) for t in topics)
    for p in _pool(Problem, tids, author):
        pmap[p.topic_id].append(p)
    questions = _round_robin(qmap, count, rng) if count != 0 else []
    problems = _round_robin(pmap, problems_count, rng) if problems_count else []
    return questions, problems, rng


@transaction.atomic
def create_attempt(user, *, topics, count=20, problems=0, time_limit_min=None, assignment=None,
                   show_answers=Attempt.ShowAnswers.IMMEDIATELY, seed=None) -> Attempt:
    author = assignment.teacher if assignment else None
    questions, probs, rng = select_items(topics, count, problems, author=author, seed=seed)
    if not questions and not probs:
        raise ValueError("Tanlangan mavzularda savol topilmadi")
    now = timezone.now()
    attempt = Attempt.objects.create(
        user=user, assignment=assignment, show_answers=show_answers,
        config={"topics": list(topics), "count": count, "problems": problems, "time_limit_min": time_limit_min},
        deadline_at=now + timedelta(minutes=time_limit_min) if time_limit_min else None,
    )
    items = []
    for i, q in enumerate(questions):
        order = list(range(len(q.options)))
        rng.shuffle(order)
        items.append(AttemptItem(attempt=attempt, order=i, question=q, option_order=order))
    base = len(items)
    for j, p in enumerate(probs):
        values, ans = generate_params(p, rng)
        items.append(AttemptItem(attempt=attempt, order=base + j, problem=p, params=values, answer_value=ans))
    AttemptItem.objects.bulk_create(items)
    attempt.max_score = sum(it.points for it in items)
    attempt.save(update_fields=["max_score"])
    return attempt


def generate_params(problem: Problem, rng):
    """FT-6.2: params = {"U": [min, max, qadam], ...}, formula — javob (masalan "U/R").
    Har o'quvchiga boshqa sonlar — ko'chirib olish foydasiz."""
    if not problem.params or not problem.formula:
        return None, None
    import math

    # Tasodifiy qiymatlar formulani buzsa (masalan nolga bo'lish) — boshqa qiymatlar olinadi;
    # 10 urinishdan keyin ham bo'lmasa masala parametrsiz (asl javob bilan) beriladi
    for _ in range(10):
        values = {}
        for name, (lo, hi, step) in problem.params.items():
            n = int(round((hi - lo) / step))
            v = lo + step * rng.randint(0, max(n, 0))
            values[name] = round(v, 10)
        try:
            return values, safe_eval(problem.formula, {**values, "pi": math.pi})
        except (ValueError, ZeroDivisionError):
            continue
    return None, None


def is_expired(attempt: Attempt) -> bool:
    return attempt.deadline_at is not None and timezone.now() > attempt.deadline_at


class AnswerError(ValueError):
    pass


def answer_item(attempt: Attempt, item: AttemptItem, answer) -> bool:
    """O'quvchi javobini tekshirib saqlaydi. MCQ: ko'rsatilgan variant raqami (0–3); hisoblash: matn."""
    if attempt.is_finished:
        raise AnswerError("Test yakunlangan")
    if is_expired(attempt):
        raise AnswerError("Vaqt tugagan")
    # Javob darhol ko'rsatiladigan rejimda qayta javob berib bo'lmaydi (aks holda to'g'risini topib olish oson)
    if attempt.show_answers == Attempt.ShowAnswers.IMMEDIATELY and item.answered_at is not None:
        raise AnswerError("Bu savolga javob berilgan")
    if item.question_id:
        try:
            shown = int(answer)
        except (TypeError, ValueError) as e:
            raise AnswerError("Variant raqami 0–3 bo'lishi kerak") from e
        if not 0 <= shown < len(item.option_order):
            raise AnswerError("Variant raqami 0–3 bo'lishi kerak")
        original = item.option_order[shown]
        item.given_answer = str(shown)
        item.is_correct = original == item.question.correct_index
    else:
        value = parse_answer(answer)
        if value is None:
            raise AnswerError("Avval raqamli javobni kiriting")
        item.given_answer = str(answer)[:60]
        correct = item.answer_value if item.answer_value is not None else item.problem.answer
        item.is_correct = is_close(value, correct, item.problem.tolerance_pct)
    item.answered_at = timezone.now()
    item.save(update_fields=["given_answer", "is_correct", "answered_at"])
    return item.is_correct


@transaction.atomic
def finish_attempt(attempt: Attempt) -> Attempt:
    if attempt.is_finished:
        return attempt
    # Bir urinishni ikki so'rov bir vaqtda yakunlasa — statistika ikki marta yozilmasin
    locked = Attempt.objects.select_for_update().get(pk=attempt.pk)
    if locked.is_finished:
        attempt.refresh_from_db()
        return attempt
    items = list(attempt.items.select_related("question__topic", "problem__topic"))
    q_inc: dict[int, dict] = {}
    p_inc: dict[int, dict] = {}
    score = 0
    breakdown: dict[str, dict] = {}
    for it in items:
        obj = it.question or it.problem
        level = it.question.get_level_display() if it.question_id else "Hisoblash"
        tag = f"{obj.topic.title_uz} · {level}"
        b = breakdown.setdefault(tag, {"ok": 0, "all": 0, "topic": obj.topic.key})
        b["all"] += 1
        if it.is_correct:
            b["ok"] += 1
            score += it.points
        # FT-6.8: savol statistikasi — avval yig'amiz, keyin tartib bilan yozamiz
        if it.question_id:
            d = q_inc.setdefault(it.question_id, {"total": 0, "correct": 0, "choices": [0, 0, 0, 0]})
            if it.answered_at is not None:
                d["choices"][it.option_order[int(it.given_answer)]] += 1
        else:
            d = p_inc.setdefault(it.problem_id, {"total": 0, "correct": 0})
        d["total"] += 1
        d["correct"] += 1 if it.is_correct else 0
    # Qatorlar doim id bo'yicha bir xil tartibda qulflanadi — parallel yakunlashda deadlock bo'lmaydi
    for qid in sorted(q_inc):
        d = q_inc[qid]
        upd = {"stats_total": F("stats_total") + d["total"], "stats_correct": F("stats_correct") + d["correct"]}
        for i, n in enumerate(d["choices"]):
            if n:
                upd[f"choice_{i}"] = F(f"choice_{i}") + n
        Question.objects.filter(pk=qid).update(**upd)
    for pid in sorted(p_inc):
        d = p_inc[pid]
        Problem.objects.filter(pk=pid).update(stats_total=F("stats_total") + d["total"],
                                              stats_correct=F("stats_correct") + d["correct"])
    attempt.score = score
    attempt.percent = round(score / attempt.max_score * 100, 1) if attempt.max_score else 0
    attempt.grade = grade_from_percent(attempt.percent)
    attempt.topic_breakdown = breakdown
    attempt.finished_at = min(timezone.now(), attempt.deadline_at) if attempt.deadline_at else timezone.now()
    attempt.save()
    return attempt


def answers_visible(attempt: Attempt) -> bool:
    if attempt.show_answers == Attempt.ShowAnswers.IMMEDIATELY:
        return True
    if attempt.show_answers == Attempt.ShowAnswers.AFTER_DUE:
        a = attempt.assignment
        return bool(a and a.due_at and timezone.now() >= a.due_at)
    return False

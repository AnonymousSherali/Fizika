from rest_framework import serializers

from apps.simulations.serializers import lang

from .models import Attempt, AttemptItem, Problem, Question, Topic
from .services import answers_visible


class TopicSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    questions = serializers.IntegerField(source="n_questions", read_only=True)
    problems = serializers.IntegerField(source="n_problems", read_only=True)

    class Meta:
        model = Topic
        fields = ["key", "title", "order", "questions", "problems"]

    def get_title(self, obj) -> str:
        return obj.title_ru if lang() == "ru" and obj.title_ru else obj.title_uz


# ---------- Savollar banki (o'qituvchi / admin) ----------
class OptionSerializer(serializers.Serializer):
    uz = serializers.CharField(max_length=300)
    ru = serializers.CharField(max_length=300, required=False, allow_blank=True)


class QuestionSerializer(serializers.ModelSerializer):
    topic = serializers.SlugRelatedField(slug_field="key", queryset=Topic.objects.all())
    options = OptionSerializer(many=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ["id", "topic", "level", "difficulty", "text_uz", "text_ru", "options", "correct_index",
                  "explanation_uz", "explanation_ru", "status", "author_name",
                  "stats_total", "stats_correct", "stats_choices", "created_at"]
        read_only_fields = ["stats_total", "stats_correct", "stats_choices", "created_at"]

    def get_author_name(self, obj) -> str | None:
        return f"{obj.author.last_name} {obj.author.first_name}".strip() if obj.author else None

    def validate_options(self, v):
        if len(v) != 4:
            raise serializers.ValidationError("Aniq 4 ta variant bo'lishi kerak")
        texts = [o["uz"].strip().lower() for o in v]
        if len(set(texts)) != 4:
            raise serializers.ValidationError("Variantlar takrorlanmasligi kerak")
        return v

    def validate_correct_index(self, v):
        if not 0 <= v <= 3:
            raise serializers.ValidationError("0–3 oralig'ida bo'lishi kerak")
        return v

    def validate_status(self, v):
        user = self.context["request"].user
        if v == "approved" and not user.is_platform_admin:
            raise serializers.ValidationError("Savolni faqat administrator tasdiqlaydi")
        return v


class ProblemSerializer(serializers.ModelSerializer):
    topic = serializers.SlugRelatedField(slug_field="key", queryset=Topic.objects.all())

    class Meta:
        model = Problem
        fields = ["id", "topic", "text_uz", "text_ru", "answer", "unit", "tolerance_pct", "solution_uz",
                  "solution_ru", "status", "stats_total", "stats_correct", "created_at"]
        read_only_fields = ["stats_total", "stats_correct", "created_at"]

    def validate_tolerance_pct(self, v):
        if not 0 < v <= 50:
            raise serializers.ValidationError("0 dan katta va 50% dan oshmasligi kerak")
        return v

    validate_status = QuestionSerializer.validate_status


# ---------- Test sessiyasi ----------
class StartAttemptSerializer(serializers.Serializer):
    assignment_id = serializers.UUIDField(required=False)
    topics = serializers.ListField(child=serializers.CharField(max_length=60), required=False, allow_empty=False)
    count = serializers.IntegerField(min_value=0, max_value=200, required=False, default=20)
    problems = serializers.IntegerField(min_value=0, max_value=60, required=False, default=0)
    time_limit_min = serializers.IntegerField(min_value=1, max_value=240, required=False, allow_null=True)

    def validate(self, data):
        if not data.get("assignment_id") and not data.get("topics"):
            raise serializers.ValidationError("assignment_id yoki topics kerak")
        return data


class AnswerSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
    answer = serializers.CharField(max_length=60)


class AttemptItemPublicSerializer(serializers.ModelSerializer):
    """O'quvchiga yuboriladigan savol — to'g'ri javobsiz!"""

    item_id = serializers.IntegerField(source="order")
    type = serializers.CharField(source="kind")
    topic = serializers.SerializerMethodField()
    text = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()
    answered = serializers.SerializerMethodField()

    class Meta:
        model = AttemptItem
        fields = ["item_id", "type", "topic", "text", "options", "unit", "points", "given_answer", "answered"]

    def get_topic(self, it) -> str:
        if it.question_id:
            return f"{it.question.topic.title_uz} · {it.question.get_level_display()}"
        return f"{it.problem.topic.title_uz} · Hisoblash"

    def get_text(self, it) -> str:
        return (it.question or it.problem).text(lang())

    def get_options(self, it) -> list[str] | None:
        if not it.question_id:
            return None
        texts = it.question.option_texts(lang())
        return [texts[i] for i in it.option_order]

    def get_unit(self, it) -> str | None:
        return it.problem.unit if it.problem_id else None

    def get_answered(self, it) -> bool:
        return it.answered_at is not None


class AttemptSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    remaining_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Attempt
        fields = ["id", "assignment", "config", "show_answers", "started_at", "deadline_at", "remaining_seconds",
                  "finished_at", "max_score", "items"]

    def get_items(self, obj) -> list[dict]:
        qs = obj.items.select_related("question__topic", "problem__topic")
        return AttemptItemPublicSerializer(qs, many=True).data

    def get_remaining_seconds(self, obj) -> int | None:
        if not obj.deadline_at or obj.finished_at:
            return None
        from django.utils import timezone

        return max(0, int((obj.deadline_at - timezone.now()).total_seconds()))


class ResultSerializer(serializers.ModelSerializer):
    review = serializers.SerializerMethodField()
    answers_visible = serializers.SerializerMethodField()

    class Meta:
        model = Attempt
        fields = ["id", "assignment", "started_at", "finished_at", "score", "max_score", "percent", "grade",
                  "topic_breakdown", "answers_visible", "review"]

    def get_answers_visible(self, obj) -> bool:
        return answers_visible(obj)

    def get_review(self, obj) -> list[dict] | None:
        """Xato javoblar va izohlar — faqat ruxsat berilganda (FT-5.3 show_answers)."""
        if not answers_visible(obj):
            return None
        lg = lang()
        out = []
        for it in obj.items.select_related("question__topic", "problem__topic"):
            if it.is_correct:
                continue
            if it.question_id:
                q = it.question
                texts = q.option_texts(lg)
                given = (texts[it.option_order[int(it.given_answer)]] if it.given_answer != "" else None)
                out.append({"item_id": it.order, "type": "mcq", "text": q.text(lg), "given": given,
                            "correct": texts[q.correct_index], "explanation": q.explanation(lg)})
            else:
                p = it.problem
                out.append({"item_id": it.order, "type": "calc", "text": p.text(lg), "given": it.given_answer or None,
                            "correct": f"{p.answer:g} {p.unit}".strip(), "explanation": p.solution(lg)})
        return out


class PracticeQuestionSerializer(serializers.Serializer):
    """Mashq rejimi (FT-6.7): nazorat emas — to'g'ri javob va izoh bilan."""

    id = serializers.IntegerField()
    topic = serializers.CharField()
    tag = serializers.CharField()
    text = serializers.CharField()
    options = serializers.ListField(child=serializers.CharField())
    correct = serializers.IntegerField()
    explanation = serializers.CharField()


class AttemptListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attempt
        fields = ["id", "assignment", "started_at", "finished_at", "percent", "grade", "max_score", "score"]

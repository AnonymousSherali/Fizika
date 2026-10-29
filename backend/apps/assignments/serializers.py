from rest_framework import serializers

from apps.quizzes.models import Topic
from apps.schools.models import Classroom, ClassroomMember
from apps.simulations.models import Simulation
from apps.simulations.serializers import lang

from .models import Assignment, Submission
from .services import student_status

MAX_IMAGE_BYTES = 500 * 1024


class QuizConfigSerializer(serializers.Serializer):
    topics = serializers.ListField(child=serializers.CharField(max_length=60), allow_empty=False)
    count = serializers.IntegerField(min_value=0, max_value=200, default=20)
    problems = serializers.IntegerField(min_value=0, max_value=60, default=0)
    time_limit_min = serializers.IntegerField(min_value=1, max_value=240, required=False, allow_null=True)

    def validate_topics(self, v):
        known = set(Topic.objects.filter(key__in=v).values_list("key", flat=True))
        unknown = [t for t in v if t not in known]
        if unknown:
            raise serializers.ValidationError(f"Noma'lum mavzular: {', '.join(unknown)}")
        return v

    def validate(self, data):
        if data["count"] == 0 and data["problems"] == 0:
            raise serializers.ValidationError("Kamida bitta savol yoki masala bo'lishi kerak")
        return data


class AssignmentSerializer(serializers.ModelSerializer):
    classrooms = serializers.PrimaryKeyRelatedField(many=True, queryset=Classroom.objects.all())
    simulation = serializers.SlugRelatedField(slug_field="slug", queryset=Simulation.objects.all(),
                                              required=False, allow_null=True)
    quiz_config = QuizConfigSerializer(required=False, allow_null=True)
    steps = serializers.ListField(child=serializers.CharField(max_length=500), required=False, allow_null=True)
    teacher_name = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ["id", "type", "title", "instructions_uz", "instructions_ru", "classrooms", "simulation", "steps",
                  "min_rows", "require_graph", "require_conclusion", "quiz_config", "max_attempts",
                  "show_answers", "starts_at", "due_at", "allow_late", "late_penalty_pct", "grading_scale",
                  "teacher_name", "stats", "created_at"]
        read_only_fields = ["created_at"]

    def get_teacher_name(self, obj) -> str:
        return f"{obj.teacher.last_name} {obj.teacher.first_name}".strip()

    def get_stats(self, obj) -> dict | None:
        """O'qituvchi uchun qisqa holat: nechta topshirildi / baholandi."""
        if not self.context["request"].user.is_teacher and not self.context["request"].user.is_platform_admin:
            return None
        students = ClassroomMember.objects.filter(classroom__in=obj.classrooms.all(),
                                                  role=ClassroomMember.Role.STUDENT).values("user").distinct().count()
        subs = obj.submissions.all()
        return {"students": students,
                "submitted": subs.filter(status=Submission.Status.SUBMITTED).count(),
                "graded": subs.filter(status=Submission.Status.GRADED).count(),
                "returned": subs.filter(status=Submission.Status.RETURNED).count()}

    def validate_classrooms(self, v):
        user = self.context["request"].user
        if not v:
            raise serializers.ValidationError("Kamida bitta sinf tanlang")
        if not user.is_platform_admin:
            mine = set(ClassroomMember.objects.filter(
                user=user, role__in=[ClassroomMember.Role.TEACHER, ClassroomMember.Role.ASSISTANT]
            ).values_list("classroom_id", flat=True))
            foreign = [c.id for c in v if c.id not in mine]
            if foreign:
                raise serializers.ValidationError("Faqat o'z sinflaringizga topshiriq bera olasiz")
        return v

    def validate(self, data):
        t = data.get("type", getattr(self.instance, "type", None))
        sim = data.get("simulation", getattr(self.instance, "simulation", None))
        qc = data.get("quiz_config", getattr(self.instance, "quiz_config", None))
        if t == Assignment.Type.LAB and not sim:
            raise serializers.ValidationError({"simulation": ["Laboratoriya ishi uchun model tanlang"]})
        if t == Assignment.Type.TEST and not qc:
            raise serializers.ValidationError({"quiz_config": ["Test sozlamasini kiriting"]})
        starts, due = data.get("starts_at"), data.get("due_at")
        if starts and due and due <= starts:
            raise serializers.ValidationError({"due_at": ["Muddat boshlanish vaqtidan keyin bo'lishi kerak"]})
        if "max_attempts" in data and not 1 <= data["max_attempts"] <= 3:
            raise serializers.ValidationError({"max_attempts": ["1–3 oralig'ida"]})
        if "late_penalty_pct" in data and data["late_penalty_pct"] > 100:
            raise serializers.ValidationError({"late_penalty_pct": ["0–100%"]})
        return data


class StudentAssignmentSerializer(serializers.ModelSerializer):
    """O'quvchiga ko'rinadigan topshiriq (FT-5.4)."""

    simulation = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    simulation_page = serializers.CharField(source="simulation.page_path", read_only=True, default=None)
    instructions = serializers.SerializerMethodField()
    steps = serializers.SerializerMethodField()
    my_status = serializers.SerializerMethodField()
    my_grade = serializers.SerializerMethodField()
    attempts_left = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ["id", "type", "title", "instructions", "simulation", "simulation_page", "steps", "min_rows",
                  "require_graph", "require_conclusion", "max_attempts", "attempts_left", "starts_at", "due_at",
                  "allow_late", "grading_scale", "teacher_name", "my_status", "my_grade", "created_at"]

    def _sub(self, obj):
        cache = self.context.setdefault("_subs", {})
        if obj.pk not in cache:
            cache[obj.pk] = obj.submissions.filter(student=self.context["request"].user).first()
        return cache[obj.pk]

    def get_instructions(self, obj) -> str:
        return obj.instructions_ru if lang() == "ru" and obj.instructions_ru else obj.instructions_uz

    def get_steps(self, obj) -> list[str]:
        if obj.steps:
            return obj.steps
        if obj.simulation_id:
            ru = lang() == "ru"
            return [(t.text_ru if ru and t.text_ru else t.text_uz) for t in obj.simulation.tasks.all()]
        return []

    def get_my_status(self, obj) -> str:
        return student_status(obj, self._sub(obj))

    def get_my_grade(self, obj) -> dict | None:
        s = self._sub(obj)
        if not s or s.status != Submission.Status.GRADED:
            return None
        return {"grade": s.grade, "comment": s.teacher_comment, "graded_at": s.graded_at}

    def get_attempts_left(self, obj) -> int | None:
        if obj.type != Assignment.Type.TEST:
            return None
        s = self._sub(obj)
        return max(0, obj.max_attempts - (s.attempts_used if s else 0))

    def get_teacher_name(self, obj) -> str:
        return f"{obj.teacher.last_name} {obj.teacher.first_name}".strip()


class SubmitLabSerializer(serializers.Serializer):
    lab_journal_id = serializers.UUIDField()
    conclusion = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")
    image = serializers.ImageField(required=False)

    def validate_image(self, f):
        if f.size > MAX_IMAGE_BYTES:
            raise serializers.ValidationError("Rasm hajmi 500 KB dan oshmasligi kerak")
        if (getattr(f, "content_type", "") or "").lower() != "image/png":
            raise serializers.ValidationError("Faqat PNG rasm")
        return f


class SubmissionSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()
    attempt_result = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = ["id", "assignment", "student", "status", "lab_journal", "lab_snapshot", "conclusion", "image",
                  "attempt", "attempts_used", "attempt_result", "submitted_at", "is_late", "auto_score",
                  "suggested_grade", "grade", "teacher_comment", "graded_at"]

    def get_student(self, obj) -> dict:
        return {"id": str(obj.student_id), "username": obj.student.username,
                "name": f"{obj.student.last_name} {obj.student.first_name}".strip()}

    def get_attempt_result(self, obj) -> dict | None:
        a = obj.attempt
        if not a:
            return None
        return {"percent": a.percent, "score": a.score, "max_score": a.max_score,
                "topic_breakdown": a.topic_breakdown, "finished_at": a.finished_at}


class GradeSerializer(serializers.Serializer):
    grade = serializers.FloatField()
    comment = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")

    def validate(self, data):
        scale = self.context["assignment"].grading_scale
        lo, hi = (2, 5) if scale == Assignment.Scale.FIVE else (0, 100)
        if not lo <= data["grade"] <= hi:
            raise serializers.ValidationError({"grade": [f"Baho {lo}–{hi} oralig'ida bo'lishi kerak"]})
        return data


class ReturnSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=2000)


class RosterRowSerializer(serializers.Serializer):
    """O'qituvchi uchun: sinfdagi har bir o'quvchi va uning holati (topshirmaganlar ham)."""

    student = serializers.DictField()
    classroom = serializers.CharField()
    status = serializers.CharField()
    submission_id = serializers.UUIDField(allow_null=True)
    submitted_at = serializers.DateTimeField(allow_null=True)
    is_late = serializers.BooleanField()
    suggested_grade = serializers.FloatField(allow_null=True)
    grade = serializers.FloatField(allow_null=True)

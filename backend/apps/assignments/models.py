from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.files import PrivateUpload, delete_files_on_delete
from apps.core.models import UUIDModel


class Assignment(UUIDModel):
    """Topshiriq: laboratoriya ishi yoki test (FT-5.1 – FT-5.3)."""

    class Type(models.TextChoices):
        LAB = "lab", "Laboratoriya ishi"
        TEST = "test", "Test"

    class Scale(models.IntegerChoices):
        FIVE = 5, "5 ballik (2–5)"
        HUNDRED = 100, "100 ballik"

    # O'qituvchi hisobi o'chirilsa topshiriq va o'quvchilarning baholari saqlanib qoladi (CASCADE ularni o'chirardi)
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                related_name="assignments")
    type = models.CharField("turi", max_length=4, choices=Type.choices)
    title = models.CharField("sarlavha", max_length=150)
    instructions_uz = models.TextField("ko'rsatma (uz)", blank=True)
    instructions_ru = models.TextField("ko'rsatma (ru)", blank=True)
    classrooms = models.ManyToManyField("schools.Classroom", related_name="assignments", verbose_name="sinflar")

    # Laboratoriya ishi (FT-5.2)
    simulation = models.ForeignKey("simulations.Simulation", null=True, blank=True, on_delete=models.PROTECT,
                                   related_name="assignments")
    steps = models.JSONField("topshiriq qadamlari", null=True, blank=True,
                             help_text="Bo'sh bo'lsa modelning standart qadamlari")
    min_rows = models.PositiveSmallIntegerField("kamida qatorlar", default=3)
    require_graph = models.BooleanField("grafik talab qilinadi", default=True)
    require_conclusion = models.BooleanField("xulosa talab qilinadi", default=True)

    # Test (FT-5.3): {"topics": [...], "count": 20, "problems": 3, "time_limit_min": 30}
    quiz_config = models.JSONField("test sozlamasi", null=True, blank=True)
    max_attempts = models.PositiveSmallIntegerField("urinishlar soni", default=1)
    show_answers = models.CharField("javoblarni ko'rsatish", max_length=12, default="after_due",
                                    choices=[("immediately", "Darhol"), ("after_due", "Muddatdan keyin"),
                                             ("never", "Hech qachon")])

    starts_at = models.DateTimeField("boshlanishi", null=True, blank=True)
    due_at = models.DateTimeField("muddati", null=True, blank=True)
    allow_late = models.BooleanField("kech topshirishga ruxsat", default=False)
    late_penalty_pct = models.PositiveSmallIntegerField("kechikish jarimasi (%)", default=0)
    grading_scale = models.PositiveSmallIntegerField("baholash shkalasi", choices=Scale.choices, default=Scale.FIVE)

    class Meta:
        verbose_name = "topshiriq"
        verbose_name_plural = "topshiriqlar"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["teacher", "-created_at"])]

    def __str__(self):
        return self.title

    def clean(self):
        """Admin panel formasi ham API bilan bir xil tekshiriladi (buzilgan sozlama ro'yxatni 500 qilardi)."""
        from django.core.exceptions import ValidationError

        from .serializers import QuizConfigSerializer

        errors = {}
        if self.type == self.Type.LAB and not self.simulation_id:
            errors["simulation"] = ["Laboratoriya ishi uchun model tanlang"]
        if self.type == self.Type.TEST:
            s = QuizConfigSerializer(data=self.quiz_config if isinstance(self.quiz_config, dict) else {})
            if not self.quiz_config or not s.is_valid():
                errors["quiz_config"] = ['{"topics": ["kepler"], "count": 20, "problems": 0, "time_limit_min": 30} '
                                         "ko'rinishida bo'lishi kerak" + (f": {s.errors}" if self.quiz_config else "")]
            else:
                self.quiz_config = s.validated_data
        if not 1 <= (self.max_attempts or 0) <= 3:
            errors["max_attempts"] = ["1–3 oralig'ida"]
        if self.late_penalty_pct is not None and self.late_penalty_pct > 100:
            errors["late_penalty_pct"] = ["0–100%"]
        if self.starts_at and self.due_at and self.due_at <= self.starts_at:
            errors["due_at"] = ["Muddat boshlanish vaqtidan keyin bo'lishi kerak"]
        if errors:
            raise ValidationError(errors)

    @property
    def is_open(self) -> bool:
        return self.starts_at is None or self.starts_at <= timezone.now()

    @property
    def is_past_due(self) -> bool:
        return self.due_at is not None and timezone.now() > self.due_at


class Submission(UUIDModel):
    """O'quvchining topshirig'i (FT-5.5 – FT-5.7)."""

    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "Bajarilmoqda"
        SUBMITTED = "submitted", "Topshirildi"
        GRADED = "graded", "Baholandi"
        RETURNED = "returned", "Qayta topshirishga qaytarildi"

    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="submissions")
    status = models.CharField("holat", max_length=12, choices=Status.choices, default=Status.IN_PROGRESS)

    # Laboratoriya: topshirilgan paytdagi nusxa (keyin jurnal o'zgarsa ham baholangan holat saqlanadi)
    lab_journal = models.ForeignKey("labs.LabJournal", null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name="submissions")
    lab_snapshot = models.JSONField("jurnal nusxasi", null=True, blank=True)
    conclusion = models.TextField("xulosa", blank=True, max_length=2000)
    image = models.ImageField("grafik rasmi", upload_to=PrivateUpload("submissions"), null=True, blank=True)

    # Test
    attempt = models.ForeignKey("quizzes.Attempt", null=True, blank=True, on_delete=models.SET_NULL,
                                related_name="+", verbose_name="eng yaxshi urinish")
    attempts_used = models.PositiveSmallIntegerField(default=0)

    submitted_at = models.DateTimeField(null=True, blank=True)
    is_late = models.BooleanField(default=False)
    auto_score = models.JSONField("avtomatik tekshiruv", null=True, blank=True)
    suggested_grade = models.FloatField("tavsiya etilgan baho", null=True, blank=True)
    grade = models.FloatField("baho", null=True, blank=True)
    teacher_comment = models.TextField("o'qituvchi izohi", blank=True)
    graded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                  related_name="+")
    graded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "topshirish"
        verbose_name_plural = "topshirishlar"
        constraints = [models.UniqueConstraint(fields=["assignment", "student"], name="uniq_submission")]
        indexes = [models.Index(fields=["assignment", "status"])]

    def __str__(self):
        return f"{self.student} → {self.assignment} ({self.get_status_display()})"


models.signals.post_delete.connect(delete_files_on_delete, sender=Submission, dispatch_uid="submission-files")

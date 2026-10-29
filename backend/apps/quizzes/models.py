import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel

# Ballar (testlar.md: A — 1 ball, B — 2 ball, C — 5 ball)
POINTS = {"asosiy": 1, "chuqur": 2, "calc": 5}


class Status(models.TextChoices):
    DRAFT = "draft", "Qoralama"
    APPROVED = "approved", "Tasdiqlangan"
    ARCHIVED = "archived", "Arxiv"  # ishlatilgan savol o'chirilmaydi — arxivlanadi


class Level(models.TextChoices):
    ASOSIY = "asosiy", "Asosiy"
    CHUQUR = "chuqur", "Chuqur"


class Topic(models.Model):
    """Test mavzusi: «Kepler», «Linza» ... (FT-6.1)."""

    key = models.CharField("kalit", max_length=60, unique=True)
    title_uz = models.CharField("nomi (uz)", max_length=120)
    title_ru = models.CharField("nomi (ru)", max_length=120, blank=True)
    simulation = models.ForeignKey("simulations.Simulation", null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="quiz_topics")
    order = models.PositiveSmallIntegerField("tartib", default=0)

    class Meta:
        verbose_name = "mavzu"
        verbose_name_plural = "mavzular"
        ordering = ["order", "key"]

    def __str__(self):
        return self.title_uz


class Question(TimeStampedModel):
    """Test savoli: 4 variant (uz/ru), to'g'ri javob indeksi, izoh (FT-6.1)."""

    topic = models.ForeignKey(Topic, on_delete=models.PROTECT, related_name="questions")
    level = models.CharField("daraja", max_length=10, choices=Level.choices, default=Level.ASOSIY)
    difficulty = models.PositiveSmallIntegerField("qiyinlik", default=1, choices=[(1, "1"), (2, "2"), (3, "3")])
    text_uz = models.TextField("savol (uz)")
    text_ru = models.TextField("savol (ru)", blank=True)
    options = models.JSONField("variantlar", help_text='[{"uz": "...", "ru": "..."} × 4]')
    correct_index = models.PositiveSmallIntegerField("to'g'ri variant (0–3)")
    explanation_uz = models.TextField("izoh (uz)", blank=True)
    explanation_ru = models.TextField("izoh (ru)", blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                               related_name="questions")
    status = models.CharField("holat", max_length=10, choices=Status.choices, default=Status.DRAFT)
    # FT-6.8: savol statistikasi (har variant necha marta tanlangan)
    stats_total = models.PositiveIntegerField(default=0)
    stats_correct = models.PositiveIntegerField(default=0)
    stats_choices = models.JSONField(default=list, blank=True)
    source_key = models.CharField("import kaliti", max_length=64, blank=True, db_index=True)

    class Meta:
        verbose_name = "savol"
        verbose_name_plural = "savollar"
        ordering = ["topic__order", "level", "id"]
        indexes = [models.Index(fields=["topic", "status"])]

    def __str__(self):
        return self.text_uz[:80]

    @property
    def points(self):
        return POINTS[self.level]

    def text(self, lang):
        return self.text_ru if lang == "ru" and self.text_ru else self.text_uz

    def option_texts(self, lang):
        return [(o.get("ru") if lang == "ru" and o.get("ru") else o.get("uz", "")) for o in self.options]

    def explanation(self, lang):
        return self.explanation_ru if lang == "ru" and self.explanation_ru else self.explanation_uz


class Problem(TimeStampedModel):
    """Hisoblash masalasi: raqamli javob, birlik, ruxsat etilgan xatolik (FT-6.2)."""

    topic = models.ForeignKey(Topic, on_delete=models.PROTECT, related_name="problems")
    text_uz = models.TextField("masala (uz)")
    text_ru = models.TextField("masala (ru)", blank=True)
    answer = models.FloatField("javob")
    unit = models.CharField("birlik", max_length=30, blank=True)
    tolerance_pct = models.FloatField("ruxsat etilgan xatolik (%)", default=3)
    solution_uz = models.TextField("yechim (uz)", blank=True)
    solution_ru = models.TextField("yechim (ru)", blank=True)
    # 4-bosqich: parametrlangan masalalar (sonlar tasodifiy, javob formuladan)
    params = models.JSONField("parametrlar", null=True, blank=True)
    formula = models.CharField("formula", max_length=200, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                               related_name="problems")
    status = models.CharField("holat", max_length=10, choices=Status.choices, default=Status.DRAFT)
    stats_total = models.PositiveIntegerField(default=0)
    stats_correct = models.PositiveIntegerField(default=0)
    source_key = models.CharField("import kaliti", max_length=64, blank=True, db_index=True)

    class Meta:
        verbose_name = "hisoblash masalasi"
        verbose_name_plural = "hisoblash masalalari"
        ordering = ["topic__order", "id"]
        indexes = [models.Index(fields=["topic", "status"])]

    def __str__(self):
        return self.text_uz[:80]

    points = POINTS["calc"]

    def text(self, lang):
        return self.text_ru if lang == "ru" and self.text_ru else self.text_uz

    def solution(self, lang):
        return self.solution_ru if lang == "ru" and self.solution_ru else self.solution_uz


class Attempt(TimeStampedModel):
    """Test urinishi (FT-6.4). Foydalanuvchi o'chirilsa natija anonim saqlanadi (FT-1.7)."""

    class ShowAnswers(models.TextChoices):
        IMMEDIATELY = "immediately", "Darhol"
        AFTER_DUE = "after_due", "Muddatdan keyin"
        NEVER = "never", "Hech qachon"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
                             related_name="quiz_attempts")
    assignment = models.ForeignKey("assignments.Assignment", null=True, blank=True, on_delete=models.CASCADE,
                                   related_name="attempts")
    config = models.JSONField("sozlama", default=dict)
    show_answers = models.CharField(max_length=12, choices=ShowAnswers.choices, default=ShowAnswers.IMMEDIATELY)
    started_at = models.DateTimeField(auto_now_add=True)
    deadline_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(default=0)
    max_score = models.FloatField(default=0)
    percent = models.FloatField(default=0)
    grade = models.PositiveSmallIntegerField(null=True, blank=True)
    topic_breakdown = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "test urinishi"
        verbose_name_plural = "test urinishlari"
        ordering = ["-started_at"]
        indexes = [models.Index(fields=["user", "-finished_at"])]

    def __str__(self):
        return f"{self.user} · {self.percent:.0f}%"

    @property
    def is_finished(self):
        return self.finished_at is not None


class AttemptItem(models.Model):
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE, related_name="items")
    order = models.PositiveSmallIntegerField()
    # PROTECT: urinishda ishlatilgan savolni o'chirib bo'lmaydi (tarix buzilmasin) — arxivlanadi
    question = models.ForeignKey(Question, null=True, blank=True, on_delete=models.PROTECT)
    problem = models.ForeignKey(Problem, null=True, blank=True, on_delete=models.PROTECT)
    # Variantlar o'quvchiga shu tartibda ko'rsatiladi: option_order[ko'rsatilgan] = asl indeks
    option_order = models.JSONField(default=list, blank=True)
    given_answer = models.CharField(max_length=60, blank=True)
    is_correct = models.BooleanField(null=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "urinish savoli"
        verbose_name_plural = "urinish savollari"
        ordering = ["attempt", "order"]
        constraints = [models.UniqueConstraint(fields=["attempt", "order"], name="uniq_attempt_order")]

    def __str__(self):
        return f"{self.attempt_id}#{self.order}"

    @property
    def kind(self):
        return "mcq" if self.question_id else "calc"

    @property
    def points(self):
        if self.question_id:
            return self.question.points
        return Problem.points

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class LessonPlan(TimeStampedModel):
    """Dars ishlanma (FT-7.1). Statik saytdagilar import qilinadi (static_* yo'llar),
    o'qituvchilar yuklaganlari esa fayl sifatida saqlanadi va moderatsiyadan o'tadi (FT-7.2)."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Qoralama"
        REVIEW = "review", "Moderatsiyada"
        PUBLISHED = "published", "Nashr etilgan"
        REJECTED = "rejected", "Rad etilgan"

    title_uz = models.CharField("sarlavha (uz)", max_length=200)
    title_ru = models.CharField("sarlavha (ru)", max_length=200, blank=True)
    grade = models.PositiveSmallIntegerField("sinf", choices=[(10, "10-sinf"), (11, "11-sinf")])
    lesson_type = models.CharField("dars turi", max_length=120, blank=True)
    icon = models.CharField("belgi", max_length=8, blank=True)
    simulation = models.ForeignKey("simulations.Simulation", null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="lesson_plans")
    pdf = models.FileField("PDF", upload_to="lesson_plans/%Y/", blank=True)
    docx = models.FileField("DOCX", upload_to="lesson_plans/%Y/", blank=True)
    static_pdf = models.CharField("statik PDF yo'li", max_length=200, blank=True)
    static_docx = models.CharField("statik DOCX yo'li", max_length=200, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                               related_name="lesson_plans")
    status = models.CharField("holat", max_length=10, choices=Status.choices, default=Status.REVIEW)
    moderator_comment = models.TextField("moderator izohi", blank=True)
    downloads = models.PositiveIntegerField("yuklab olishlar", default=0)
    order = models.PositiveSmallIntegerField("tartib", default=0)

    class Meta:
        verbose_name = "dars ishlanma"
        verbose_name_plural = "dars ishlanmalar"
        ordering = ["grade", "order", "-created_at"]
        indexes = [models.Index(fields=["status", "grade"])]

    def __str__(self):
        return self.title_uz

    @property
    def has_pdf(self):
        return bool(self.pdf or self.static_pdf)

    @property
    def has_docx(self):
        return bool(self.docx or self.static_docx)


class Translation(models.Model):
    """Interfeys tarjimasi (FT-7.6): o'zbekcha matn → ruscha. i18n-ru.js shu jadvaldan yaratiladi."""

    key = models.TextField("o'zbekcha matn", unique=True)
    ru = models.TextField("ruscha", blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="+")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "tarjima"
        verbose_name_plural = "tarjimalar"
        ordering = ["key"]

    def __str__(self):
        return self.key[:80]

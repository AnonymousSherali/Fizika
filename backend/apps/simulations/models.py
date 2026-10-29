from django.db import models

from apps.core.models import TimeStampedModel


class Category(models.TextChoices):
    MEXANIKA = "mexanika", "Mexanika"
    TEBRANISH = "tebranish", "Tebranishlar"
    MOLEKULYAR = "molekulyar", "Molekulyar fizika"
    ELEKTR = "elektr", "Elektr va magnetizm"
    OPTIKA = "optika", "Optika"
    ATOM = "atom", "Atom va yadro"
    ASTRONOMIYA = "astronomiya", "Astronomiya"


class Simulation(TimeStampedModel):
    """Interaktiv model (FT-3.1). Sahifaning o'zi statik saytda, bu yerda — metama'lumot."""

    slug = models.SlugField("slug", max_length=60, unique=True)
    page_path = models.CharField("sahifa yo'li", max_length=200, help_text="modellar/mayatnik_model.html")
    title_uz = models.CharField("nomi (uz)", max_length=120)
    title_ru = models.CharField("nomi (ru)", max_length=120, blank=True)
    description_uz = models.TextField("tavsif (uz)", blank=True)
    description_ru = models.TextField("tavsif (ru)", blank=True)
    category = models.CharField("bo'lim", max_length=20, choices=Category.choices)
    grade = models.PositiveSmallIntegerField("sinf", choices=[(10, "10-sinf"), (11, "11-sinf")])
    icon = models.CharField("belgi (emoji)", max_length=8, blank=True)
    thumbnail = models.CharField("rasm yo'li", max_length=200, blank=True, help_text="img/mayatnik.jpg")
    order = models.PositiveSmallIntegerField("tartib", default=0)
    is_active = models.BooleanField("faol", default=True)
    # Jurnal grafigi uchun andoza va hosila natija (FT-4.5):
    # {"x": "L", "y": "T nazariy", "xp": 1, "yp": 2,
    #  "derived": {"name": "g", "expr": "4*pi**2/k", "unit": "m/s²", "theory_col": "g"}}
    analysis = models.JSONField("tahlil andozasi", default=dict, blank=True)

    class Meta:
        verbose_name = "model"
        verbose_name_plural = "modellar"
        ordering = ["order", "slug"]

    def __str__(self):
        return self.title_uz

    def localized(self, field: str, lang: str) -> str:
        if lang == "ru":
            value = getattr(self, f"{field}_ru", "")
            if value:
                return value
        return getattr(self, f"{field}_uz")

    @property
    def current_schema(self):
        return self.schemas.order_by("-version").first()


class SimulationTask(models.Model):
    """Topshiriq qadami (FT-3.2)."""

    simulation = models.ForeignKey(Simulation, on_delete=models.CASCADE, related_name="tasks")
    step_no = models.PositiveSmallIntegerField("qadam")
    text_uz = models.TextField("matn (uz)")
    text_ru = models.TextField("matn (ru)", blank=True)

    class Meta:
        verbose_name = "topshiriq qadami"
        verbose_name_plural = "topshiriq qadamlari"
        ordering = ["simulation", "step_no"]
        constraints = [models.UniqueConstraint(fields=["simulation", "step_no"], name="uniq_task_step")]

    def __str__(self):
        return f"{self.simulation_id}: {self.step_no}-qadam"


class SimulationExpected(models.Model):
    """Kutilgan natija — faqat o'qituvchiga ko'rinadi (FT-3.2, o'qituvchi rejimi)."""

    simulation = models.ForeignKey(Simulation, on_delete=models.CASCADE, related_name="expected")
    order = models.PositiveSmallIntegerField("tartib", default=0)
    text_uz = models.TextField("matn (uz)")
    text_ru = models.TextField("matn (ru)", blank=True)

    class Meta:
        verbose_name = "kutilgan natija"
        verbose_name_plural = "kutilgan natijalar"
        ordering = ["simulation", "order"]

    def __str__(self):
        return self.text_uz[:60]


class LabSchema(TimeStampedModel):
    """Jurnal ustunlari sxemasi (FT-3.3). Model ustunlari o'zgarsa yangi versiya yaratiladi.
    columns: [{"key": "L", "label": "L (m)", "unit": "m", "type": "number"}, ...]"""

    simulation = models.ForeignKey(Simulation, on_delete=models.CASCADE, related_name="schemas")
    version = models.PositiveSmallIntegerField("versiya", default=1)
    columns = models.JSONField("ustunlar")

    class Meta:
        verbose_name = "jurnal sxemasi"
        verbose_name_plural = "jurnal sxemalari"
        constraints = [models.UniqueConstraint(fields=["simulation", "version"], name="uniq_schema_version")]

    def __str__(self):
        return f"{self.simulation.slug} v{self.version}"

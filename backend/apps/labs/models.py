from django.conf import settings
from django.db import models

from apps.core.models import UUIDModel

MAX_ROWS = 30  # frontenddagi jurnal chegarasi bilan bir xil


class LabJournal(UUIDModel):
    """Laboratoriya jurnali (FT-4.1). client_id — oflayn navbatda takrorlanishning oldini oladi (FT-4.3)."""

    class Device(models.TextChoices):
        DESKTOP = "desktop", "Kompyuter"
        MOBILE = "mobile", "Telefon"
        TABLET = "tablet", "Planshet"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lab_journals")
    simulation = models.ForeignKey("simulations.Simulation", on_delete=models.PROTECT,
                                   related_name="journals")
    schema_version = models.PositiveSmallIntegerField("sxema versiyasi", default=1)
    title = models.CharField("sarlavha", max_length=120, blank=True)
    rows = models.JSONField("qatorlar", default=list)
    graph = models.JSONField("grafik sozlamasi", null=True, blank=True)
    analysis = models.JSONField("tahlil natijasi", null=True, blank=True)
    conclusion = models.TextField("xulosa", blank=True, max_length=2000)
    client_id = models.UUIDField("mijoz identifikatori")
    device = models.CharField("qurilma", max_length=10, choices=Device.choices, blank=True)

    class Meta:
        verbose_name = "laboratoriya jurnali"
        verbose_name_plural = "laboratoriya jurnallari"
        ordering = ["-updated_at"]
        constraints = [models.UniqueConstraint(fields=["user", "client_id"], name="uniq_lab_client")]
        indexes = [models.Index(fields=["user", "simulation", "-created_at"])]

    def __str__(self):
        return f"{self.user} · {self.simulation.slug} · {len(self.rows)} qator"

import uuid

from django.db import models


class TimeStampedModel(models.Model):
    """Barcha jadvallar uchun: created_at / updated_at (TZ 7-bo'lim)."""

    created_at = models.DateTimeField("yaratilgan", auto_now_add=True)
    updated_at = models.DateTimeField("yangilangan", auto_now=True)

    class Meta:
        abstract = True


class UUIDModel(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True

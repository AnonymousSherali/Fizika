from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Sayt ichidagi bildirishnoma (FT-9.1). Email — foydalanuvchi sozlamasi bo'yicha qo'shimcha kanal."""

    class Type(models.TextChoices):
        NEW_ASSIGNMENT = "new_assignment", "Yangi topshiriq"
        DEADLINE = "deadline", "Muddat yaqinlashdi"
        GRADED = "graded", "Baho qo'yildi"
        RETURNED = "returned", "Qayta topshirishga qaytarildi"
        NEW_STUDENT = "new_student", "Sinfga yangi o'quvchi qo'shildi"
        SUBMITTED = "submitted", "Ish topshirildi"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField("turi", max_length=20, choices=Type.choices)
    title = models.CharField("sarlavha", max_length=200)
    body = models.TextField("matn", blank=True)
    url = models.CharField("havola", max_length=300, blank=True, help_text="Sayt ildiziga nisbatan yo'l")
    # Bir xil hodisa ikki marta yuborilmasin (masalan muddat eslatmasi har 15 daqiqada tekshiriladi)
    dedupe_key = models.CharField(max_length=120, blank=True, db_index=True)
    is_read = models.BooleanField("o'qilgan", default=False)
    emailed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "bildirishnoma"
        verbose_name_plural = "bildirishnomalar"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read"])]
        constraints = [models.UniqueConstraint(fields=["user", "dedupe_key"], condition=~models.Q(dedupe_key=""),
                                               name="uniq_notification_dedupe")]

    def __str__(self):
        return f"{self.user} · {self.title}"

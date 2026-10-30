from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.db import models

# Amallarning o'zbekcha nomlari (admin panel uchun; jurnalda kod saqlanadi)
ACTION_LABELS = {
    "auth.login": "Kirish", "auth.login_failed": "Kirish (xato parol)",
    "auth.password_change": "Parol o'zgartirildi", "auth.password_reset": "Parol tiklandi",
    "account.delete_requested": "Hisobni o'chirish so'raldi",
    "user.created_by_admin": "Admin foydalanuvchi yaratdi", "user.permissions_changed": "Rol/huquq o'zgardi",
    "student.password_reset_by_teacher": "O'qituvchi o'quvchi parolini tikladi",
    "classroom.archive": "Sinf arxivlandi", "classroom.remove_student": "O'quvchi sinfdan chiqarildi",
    "classroom.auto_archive": "Sinf avtomatik arxivlandi (o'quv yili tugadi)",
    "assignment.delete": "Topshiriq o'chirildi", "grade.set": "Baho qo'yildi", "submission.return": "Ish qaytarildi",
    "lesson_plan.upload": "Ishlanma yuklandi", "lesson_plan.publish": "Ishlanma nashr etildi",
    "lesson_plan.reject": "Ishlanma rad etildi", "lesson_plan.delete": "Ishlanma o'chirildi",
}


class AuditLog(models.Model):
    """Muhim amallar jurnali (FT-11.1 – FT-11.3). Yozuvlar tahrirlanmaydi; faqat muddati o'tganda o'chiriladi."""

    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                              related_name="+", verbose_name="kim")
    action = models.CharField("amal", max_length=60, db_index=True)
    object_type = models.CharField("obyekt turi", max_length=60, blank=True)
    object_id = models.CharField("obyekt id", max_length=64, blank=True)
    before = models.JSONField("oldingi qiymat", null=True, blank=True)
    after = models.JSONField("yangi qiymat", null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField("vaqt", auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "audit yozuvi"
        verbose_name_plural = "audit jurnali"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["object_type", "object_id"])]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.action}"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise PermissionDenied("Audit yozuvini o'zgartirib bo'lmaydi")
        super().save(*args, **kwargs)

    @property
    def action_label(self):
        return ACTION_LABELS.get(self.action, self.action)

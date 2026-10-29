import uuid

from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel


class Role(models.TextChoices):
    STUDENT = "student", "O'quvchi"
    TEACHER = "teacher", "O'qituvchi"
    SCHOOL_ADMIN = "school_admin", "Maktab administratori"
    ADMIN = "admin", "Administrator"


class Language(models.TextChoices):
    UZ = "uz", "O'zbekcha"
    RU = "ru", "Русский"


class Theme(models.TextChoices):
    LIGHT = "light", "Yorug'"
    DARK = "dark", "Qorong'i"


class User(AbstractUser):
    """
    Platforma foydalanuvchisi (TZ 7.1 users).
    O'quvchidan faqat ism, familiya va login olinadi (TZ 11.2) — telefon/email ixtiyoriy.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # NULL ataylab: bo'sh qiymatlar noyoblik shartiga tushmasligi uchun (uniq_user_phone/email)
    email = models.EmailField("email", null=True, blank=True)  # noqa: DJ001
    phone = models.CharField("telefon", max_length=20, null=True, blank=True)  # noqa: DJ001
    role = models.CharField("rol", max_length=20, choices=Role.choices, default=Role.STUDENT)
    school = models.ForeignKey(
        "schools.School", verbose_name="maktab", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="users",
    )
    language = models.CharField("til", max_length=2, choices=Language.choices, default=Language.UZ)
    theme = models.CharField("mavzu", max_length=5, choices=Theme.choices, default=Theme.LIGHT)
    is_verified = models.BooleanField("tasdiqlangan", default=False)
    must_change_password = models.BooleanField("parolni almashtirishi kerak", default=False)
    notify_email = models.BooleanField("email bildirishnomalar", default=True)  # FT-9.3
    deletion_requested_at = models.DateTimeField("o'chirish so'ralgan", null=True, blank=True)

    objects = UserManager()

    class Meta:
        verbose_name = "foydalanuvchi"
        verbose_name_plural = "foydalanuvchilar"
        constraints = [
            # Bo'sh qiymatlar takrorlanishi mumkin, to'ldirilganlari — noyob
            models.UniqueConstraint(fields=["phone"], condition=Q(phone__isnull=False), name="uniq_user_phone"),
            models.UniqueConstraint(fields=["email"], condition=Q(email__isnull=False), name="uniq_user_email"),
        ]

    def __str__(self):
        full = f"{self.last_name} {self.first_name}".strip()
        return f"{full} ({self.username})" if full else self.username

    @property
    def is_student(self):
        return self.role == Role.STUDENT

    @property
    def is_teacher(self):
        return self.role in (Role.TEACHER, Role.SCHOOL_ADMIN)

    @property
    def is_platform_admin(self):
        return self.role == Role.ADMIN or self.is_superuser


class VerificationCode(TimeStampedModel):
    """SMS/email orqali yuborilgan bir martalik kod (tasdiqlash yoki parol tiklash)."""

    class Purpose(models.TextChoices):
        VERIFY = "verify", "Tasdiqlash"
        RESET = "reset", "Parolni tiklash"

    class Channel(models.TextChoices):
        SMS = "sms", "SMS"
        EMAIL = "email", "Email"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="codes")
    purpose = models.CharField(max_length=10, choices=Purpose.choices)
    channel = models.CharField(max_length=10, choices=Channel.choices)
    target = models.CharField(max_length=120)
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "tasdiqlash kodi"
        verbose_name_plural = "tasdiqlash kodlari"
        indexes = [models.Index(fields=["user", "purpose", "-created_at"])]


class LoginEvent(models.Model):
    """Kirish tarixi (FT-1.6) va audit uchun."""

    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name="login_events")
    login = models.CharField(max_length=120)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    success = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "kirish urinishi"
        verbose_name_plural = "kirish tarixi"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.login} ({'✓' if self.success else '✗'})"

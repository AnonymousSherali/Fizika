import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


class Region(models.TextChoices):
    """O'zbekiston viloyatlari (FT-2.1)."""

    TOSHKENT_SH = "toshkent_sh", "Toshkent shahri"
    TOSHKENT = "toshkent", "Toshkent viloyati"
    ANDIJON = "andijon", "Andijon viloyati"
    BUXORO = "buxoro", "Buxoro viloyati"
    FARGONA = "fargona", "Farg'ona viloyati"
    JIZZAX = "jizzax", "Jizzax viloyati"
    XORAZM = "xorazm", "Xorazm viloyati"
    NAMANGAN = "namangan", "Namangan viloyati"
    NAVOIY = "navoiy", "Navoiy viloyati"
    QASHQADARYO = "qashqadaryo", "Qashqadaryo viloyati"
    SAMARQAND = "samarqand", "Samarqand viloyati"
    SIRDARYO = "sirdaryo", "Sirdaryo viloyati"
    SURXONDARYO = "surxondaryo", "Surxondaryo viloyati"
    QORAQALPOGISTON = "qoraqalpogiston", "Qoraqalpog'iston Respublikasi"


class School(TimeStampedModel):
    name = models.CharField("nomi", max_length=200)
    region = models.CharField("viloyat", max_length=20, choices=Region.choices)
    district = models.CharField("tuman / shahar", max_length=100)
    number = models.CharField("raqami", max_length=20, blank=True)
    is_verified = models.BooleanField("tasdiqlangan", default=False)

    class Meta:
        verbose_name = "maktab"
        verbose_name_plural = "maktablar"
        ordering = ["region", "district", "name"]
        indexes = [models.Index(fields=["region", "district"])]

    def __str__(self):
        return f"{self.name} ({self.district})"


# Qo'shilish kodi: o'qilishi oson harflar, chalkash belgilarsiz (0/O, 1/I)
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_join_code() -> str:
    while True:
        code = "FZ-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(4))
        if not Classroom.objects.filter(join_code=code).exists():
            return code


def current_academic_year() -> str:
    # Yangi o'quv yili 1-iyuldan hisoblanadi: avgustda ochilgan sinf eski yilga yozilib, darhol avtomatik
    # arxivlanib qolmasin (schools.tasks.archive_finished_classrooms)
    today = timezone.localdate()
    start = today.year if today.month >= 7 else today.year - 1
    return f"{start}–{start + 1}"


def academic_year_end(year: str):
    """«2025–2026» → 2026-07-01 (shu kundan boshlab o'quv yili tugagan hisoblanadi). Noma'lum format — None."""
    import datetime
    import re

    m = re.fullmatch(r"\s*(\d{4})\s*[–-]\s*(\d{4})\s*", year or "")
    return datetime.date(int(m.group(2)), 7, 1) if m else None


class Classroom(TimeStampedModel):
    """Sinf (FT-2.2). O'quv yili tugaganda arxivga o'tadi, o'chirilmaydi (FT-2.6)."""

    school = models.ForeignKey(School, verbose_name="maktab", null=True, blank=True,
                               on_delete=models.SET_NULL, related_name="classrooms")
    name = models.CharField("nomi", max_length=40, help_text="Masalan: 10-A")
    grade = models.PositiveSmallIntegerField("sinf", choices=[(10, "10-sinf"), (11, "11-sinf")])
    academic_year = models.CharField("o'quv yili", max_length=20, default=current_academic_year)
    join_code = models.CharField("qo'shilish kodi", max_length=12, unique=True, null=True, blank=True)
    join_code_expires_at = models.DateTimeField("kod amal qilish muddati", null=True, blank=True)
    is_archived = models.BooleanField("arxivda", default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
                                   related_name="created_classrooms")
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through="ClassroomMember",
                                     related_name="classrooms")

    class Meta:
        verbose_name = "sinf"
        verbose_name_plural = "sinflar"
        ordering = ["-academic_year", "grade", "name"]

    def __str__(self):
        return f"{self.name} ({self.academic_year})"

    def refresh_join_code(self, days: int | None = 7):
        self.join_code = generate_join_code()
        self.join_code_expires_at = timezone.now() + timedelta(days=days) if days else None
        self.save(update_fields=["join_code", "join_code_expires_at", "updated_at"])

    @property
    def join_code_active(self) -> bool:
        if not self.join_code or self.is_archived:
            return False
        return self.join_code_expires_at is None or self.join_code_expires_at > timezone.now()


class ClassroomMember(models.Model):
    class Role(models.TextChoices):
        STUDENT = "student", "O'quvchi"
        TEACHER = "teacher", "Asosiy o'qituvchi"
        ASSISTANT = "assistant", "Yordamchi o'qituvchi"

    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField("rol", max_length=10, choices=Role.choices, default=Role.STUDENT)
    joined_at = models.DateTimeField("qo'shilgan", auto_now_add=True)

    class Meta:
        verbose_name = "sinf a'zosi"
        verbose_name_plural = "sinf a'zolari"
        constraints = [models.UniqueConstraint(fields=["classroom", "user"], name="uniq_classroom_member")]
        indexes = [models.Index(fields=["user"])]

    def __str__(self):
        return f"{self.user} → {self.classroom} ({self.get_role_display()})"

    @property
    def is_staff_role(self):
        return self.role in (self.Role.TEACHER, self.Role.ASSISTANT)

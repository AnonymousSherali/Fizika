"""Yuklama testi uchun o'quvchilar (yuklama1..N) va ularning sinfi. Faqat sinov bazasida ishlating!

    python manage.py create_load_users --count 500
    python manage.py create_load_users --delete
"""
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import Role, User
from apps.schools.models import Classroom, ClassroomMember

# Faqat sinov bazasidagi yuklama foydalanuvchilari uchun
PASSWORD = "Yuklama-2026!"  # nosec B105


class Command(BaseCommand):
    help = "Yuklama testi uchun foydalanuvchilar"

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=500)
        parser.add_argument("--delete", action="store_true")

    def handle(self, *args, **opts):
        if not settings.DEBUG and not opts["delete"] and "test" not in settings.DATABASES["default"]["NAME"]:
            self.stderr.write("Ogohlantirish: DEBUG=False. Production bazasida ishlatmang!")
        if opts["delete"]:
            n, _ = User.objects.filter(username__startswith="yuklama").delete()
            Classroom.objects.filter(name="Yuklama").delete()
            self.stdout.write(self.style.SUCCESS(f"O'chirildi: {n}"))
            return
        if opts["count"] < 1:
            raise CommandError("--count ≥ 1")
        cls, _ = Classroom.objects.get_or_create(name="Yuklama", grade=10)
        pwd = make_password(PASSWORD)
        existing = set(User.objects.filter(username__startswith="yuklama").values_list("username", flat=True))
        new = [User(username=f"yuklama{i}", first_name="Yuklama", last_name=str(i), role=Role.STUDENT,
                    password=pwd, is_verified=True) for i in range(1, opts["count"] + 1)
               if f"yuklama{i}" not in existing]
        User.objects.bulk_create(new, batch_size=500)
        ids = User.objects.filter(username__startswith="yuklama").values_list("id", flat=True)
        have = set(ClassroomMember.objects.filter(classroom=cls).values_list("user_id", flat=True))
        ClassroomMember.objects.bulk_create([ClassroomMember(classroom=cls, user_id=i) for i in ids if i not in have],
                                            batch_size=500)
        self.stdout.write(self.style.SUCCESS(f"{len(new)} ta yangi o'quvchi (parol: {PASSWORD})"))

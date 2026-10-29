import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.schools.models import Classroom, ClassroomMember, School

PASSWORD = "Fizika-2026!"


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """Modellar katalogi barcha testlar uchun bir marta statik saytdan import qilinadi."""
    with django_db_blocker.unblock():
        call_command("import_simulations", verbosity=0)
        call_command("import_quiz_bank", verbosity=0)


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def school(db):
    return School.objects.create(name="12-maktab", region="toshkent_sh", district="Chilonzor", number="12")


def make_user(role=Role.STUDENT, school=None, **kw):
    n = User.objects.count() + 1
    defaults = {"username": f"user{n}", "first_name": f"Ism{n}", "last_name": f"Familiya{n}",
                "role": role, "school": school, "is_verified": True}
    defaults.update(kw)
    u = User(**defaults)
    u.set_password(PASSWORD)
    u.save()
    return u


@pytest.fixture
def teacher(school):
    return make_user(Role.TEACHER, school, username="998901112233", phone="+998901112233")


@pytest.fixture
def other_teacher(school):
    return make_user(Role.TEACHER, school, username="998907778899", phone="+998907778899")


@pytest.fixture
def classroom(teacher, school):
    c = Classroom.objects.create(name="10-A", grade=10, school=school, created_by=teacher)
    ClassroomMember.objects.create(classroom=c, user=teacher, role=ClassroomMember.Role.TEACHER)
    c.refresh_join_code(days=7)
    return c


@pytest.fixture
def student(classroom):
    s = make_user(Role.STUDENT, classroom.school, username="aliyev.vali", first_name="Vali", last_name="Aliyev")
    ClassroomMember.objects.create(classroom=classroom, user=s)
    return s


@pytest.fixture
def auth():
    """auth(client, user) — JWT bilan avtorizatsiya qilingan klient."""

    def _auth(client, user):
        from apps.accounts.serializers import tokens_for

        client.credentials(HTTP_AUTHORIZATION="Bearer " + tokens_for(user)["access"])
        return client

    return _auth


@pytest.fixture
def codes(monkeypatch):
    """Yuborilgan tasdiqlash kodlarini ushlab qoladi (SMS/email o'rniga)."""
    sent = []
    import apps.accounts.services as services

    original = services.random_code

    def fake_code(length=6):
        c = original(length)
        sent.append(c)
        return c

    monkeypatch.setattr(services, "random_code", fake_code)
    return sent

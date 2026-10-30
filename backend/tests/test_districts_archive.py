"""Tumanlar ro'yxati va o'quv yili tugaganda sinflarni avtomatik arxivlash (FT-2.1, FT-2.6)."""
import datetime

import pytest

from apps.audit.models import AuditLog
from apps.schools.districts import DISTRICTS
from apps.schools.models import Classroom, Region, academic_year_end, current_academic_year
from apps.schools.tasks import archive_finished_classrooms

pytestmark = pytest.mark.django_db


def test_districts_cover_every_region(api):
    assert set(DISTRICTS) == {r.value for r in Region}
    r = api.get("/api/v1/schools/districts/")
    assert r.status_code == 200 and "Chilonzor" in r.data["toshkent_sh"]
    assert list(api.get("/api/v1/schools/districts/?region=xorazm").data) == ["xorazm"]
    assert api.get("/api/v1/schools/districts/?region=yoq").status_code == 400


@pytest.mark.parametrize("day,expected", [
    (datetime.date(2026, 6, 30), "2025–2026"),
    (datetime.date(2026, 7, 1), "2026–2027"),
    (datetime.date(2026, 8, 20), "2026–2027"),  # avgustda ochilgan sinf yangi o'quv yiliga yoziladi
    (datetime.date(2027, 1, 15), "2026–2027"),
])
def test_current_academic_year(monkeypatch, day, expected):
    monkeypatch.setattr("django.utils.timezone.localdate", lambda: day)
    assert current_academic_year() == expected


def test_academic_year_end_parsing():
    assert academic_year_end("2025–2026") == datetime.date(2026, 7, 1)
    assert academic_year_end("2025-2026") == datetime.date(2026, 7, 1)
    assert academic_year_end("10-A sinf") is None


def test_auto_archive_finished_years(monkeypatch, classroom, school, teacher):
    classroom.academic_year = "2025–2026"
    classroom.save()
    current = Classroom.objects.create(name="11-B", grade=11, school=school, created_by=teacher,
                                       academic_year="2026–2027")
    monkeypatch.setattr("django.utils.timezone.localdate", lambda: datetime.date(2026, 6, 30))
    assert archive_finished_classrooms() == 0  # yil hali tugamagan
    monkeypatch.setattr("django.utils.timezone.localdate", lambda: datetime.date(2026, 7, 2))
    assert archive_finished_classrooms() == 1
    classroom.refresh_from_db()
    current.refresh_from_db()
    assert classroom.is_archived and classroom.join_code is None and not current.is_archived
    assert AuditLog.objects.filter(action="classroom.auto_archive", object_id=str(classroom.pk)).exists()
    assert archive_finished_classrooms() == 0  # takroriy ishga tushirish xavfsiz

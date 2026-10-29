import pytest

pytestmark = pytest.mark.django_db


def test_catalog_lists_all_models(api):
    r = api.get("/api/v1/simulations/")
    assert r.status_code == 200
    assert len(r.data) == 15
    slugs = {s["slug"] for s in r.data}
    assert {"mayatnik", "linza", "fotoeffekt", "radioaktiv_yemirilish"} <= slugs


def test_catalog_filters(api):
    r = api.get("/api/v1/simulations/?category=optika")
    assert {s["slug"] for s in r.data} == {"yoruglik_sinishi", "linza"}
    r = api.get("/api/v1/simulations/?grade=11&q=fotoeffekt")
    assert [s["slug"] for s in r.data] == ["fotoeffekt"]


def test_detail_has_tasks_and_schema(api):
    r = api.get("/api/v1/simulations/mayatnik/")
    assert r.status_code == 200
    assert len(r.data["tasks"]) == 6
    cols = r.data["schema"]["columns"]
    assert cols[0] == {"key": "L", "label": "L (m)", "unit": "m", "type": "number"}
    assert r.data["analysis"]["derived"]["name"] == "g"


def test_text_columns_detected(api):
    cols = api.get("/api/v1/simulations/gaz_qonunlari/").data["schema"]["columns"]
    assert cols[0]["key"] == "Jarayon" and cols[0]["type"] == "text"


def test_russian_titles(api):
    r = api.get("/api/v1/simulations/om_qonuni/", HTTP_ACCEPT_LANGUAGE="ru")
    assert r.data["title"] == "Закон Ома"


def test_expected_only_for_teachers(api, auth, teacher, student):
    assert api.get("/api/v1/simulations/mayatnik/expected/").status_code == 401
    auth(api, student)
    assert api.get("/api/v1/simulations/mayatnik/expected/").status_code == 403
    auth(api, teacher)
    r = api.get("/api/v1/simulations/mayatnik/expected/")
    assert r.status_code == 200 and "2.006" in r.data[0]["text"]


def test_import_is_idempotent(db):
    from django.core.management import call_command

    from apps.simulations.models import LabSchema

    before = LabSchema.objects.count()
    call_command("import_simulations", verbosity=0)
    assert LabSchema.objects.count() == before

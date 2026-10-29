import pytest

pytestmark = pytest.mark.django_db


def test_health(api):
    r = api.get("/api/v1/health/")
    assert r.status_code == 200 and r.data == {"status": "ok", "database": "ok", "cache": "ok"}


def test_openapi_schema_and_docs(api):
    r = api.get("/api/schema/")
    assert r.status_code == 200
    assert b"/api/v1/labs/" in r.content
    assert api.get("/api/docs/").status_code == 200


def test_admin_login_page(client):
    assert client.get("/admin/login/").status_code == 200


def test_404_format(api):
    r = api.get("/api/v1/simulations/yoq-model/")
    assert r.status_code == 404 and r.data["error"]["code"] == "not_found"

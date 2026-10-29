import math
import uuid

import pytest

from apps.labs.analysis import analyze, linfit, safe_eval
from apps.labs.models import LabJournal

from .conftest import make_user

pytestmark = pytest.mark.django_db


def pendulum_rows():
    """Mayatnik jurnali: L, θ₀, g, T nazariy, Tebranish, g o'lch., Xatolik."""
    rows = []
    for L in (0.5, 1.0, 1.5, 2.0):
        T = 2 * math.pi * math.sqrt(L / 9.81)
        rows.append([L, 10, 9.81, round(T, 3), 5, 9.77, 0.4])
    return rows


def payload(**kw):
    data = {"client_id": str(uuid.uuid4()), "simulation": "mayatnik", "rows": pendulum_rows(), "device": "mobile"}
    data.update(kw)
    return data


def test_create_lab_and_derived_g(api, auth, student):
    auth(api, student)
    r = api.post("/api/v1/labs/", payload(), format="json")
    assert r.status_code == 201, r.data
    a = r.data["analysis"]
    assert a["points"] == 4 and a["fit"]["r2"] > 0.9999
    assert a["derived"]["name"] == "g"
    assert abs(a["derived"]["value"] - 9.81) < 0.02
    assert a["derived"]["theory"] == 9.81 and a["derived"]["error_pct"] < 0.2
    assert r.data["columns"][0]["label"] == "L (m)"


def test_upsert_by_client_id_is_idempotent(api, auth, student):
    """FT-4.3: oflayn navbat bir so'rovni qayta yuborsa dublikat bo'lmaydi."""
    auth(api, student)
    p = payload()
    assert api.post("/api/v1/labs/", p, format="json").status_code == 201
    p["rows"] = p["rows"][:2]
    r = api.post("/api/v1/labs/", p, format="json")
    assert r.status_code == 200 and r.data["rows_count"] == 2
    assert LabJournal.objects.filter(user=student).count() == 1


def test_client_id_scoped_per_user(api, auth, student, classroom):
    other = make_user(school=classroom.school, username="boshqa.oquvchi")
    p = payload()
    auth(api, student)
    api.post("/api/v1/labs/", p, format="json")
    auth(api, other)
    assert api.post("/api/v1/labs/", p, format="json").status_code == 201
    assert LabJournal.objects.count() == 2


def test_validation_rows(api, auth, student):
    auth(api, student)
    r = api.post("/api/v1/labs/", payload(rows=[[1, 2, 3]]), format="json")
    assert r.status_code == 400 and "7 ta qiymat" in r.data["error"]["fields"]["rows"][0]
    r = api.post("/api/v1/labs/", payload(rows=[["abc", 10, 9.81, 2, 5, 9.8, 0.1]]), format="json")
    assert r.status_code == 400
    r = api.post("/api/v1/labs/", payload(rows=[pendulum_rows()[0]] * 31), format="json")
    assert r.status_code == 400
    # Vergulli son va "—" qabul qilinadi
    r = api.post("/api/v1/labs/", payload(rows=[["1,5", 10, 9.81, "2,457", 5, "—", None]]), format="json")
    assert r.status_code == 201, r.data
    assert r.data["rows"][0][0] == 1.5 and r.data["rows"][0][5] is None


def test_text_column_lab(api, auth, student):
    auth(api, student)
    rows = [["Izotermik", 124.7, 1.0, 300, 124.65, 3.333, 415.5], ["Izotermik", 62.3, 2.0, 300, 124.65, 6.667, 207.8]]
    r = api.post("/api/v1/labs/", payload(simulation="gaz_qonunlari", rows=rows), format="json")
    assert r.status_code == 201, r.data
    d = r.data["analysis"]["derived"]
    assert d["name"] == "pV" and abs(d["value"] - 124.6) < 0.2


def test_lens_derived_focal_length(api, auth, student):
    auth(api, student)
    rows = []
    for d, f in ((30, 15), (20, 20), (15, 30)):
        rows.append(["Yig'uvchi", 10, 10, d, 3, f, 3 * f / d, f / d, 10, "haqiqiy"])
    r = api.post("/api/v1/labs/", payload(simulation="linza", rows=rows), format="json")
    assert r.status_code == 201, r.data
    d = r.data["analysis"]["derived"]
    assert d["name"] == "F" and abs(d["value"] - 10) < 1e-6 and d["error_pct"] < 1e-6


def test_owner_permissions_and_teacher_read(api, auth, student, teacher, other_teacher, classroom):
    auth(api, student)
    lab_id = api.post("/api/v1/labs/", payload(), format="json").data["id"]
    # Sinf o'qituvchisi o'qiy oladi, lekin o'zgartira olmaydi
    auth(api, teacher)
    assert api.get(f"/api/v1/labs/{lab_id}/").status_code == 200
    assert api.patch(f"/api/v1/labs/{lab_id}/", {"title": "x"}, format="json").status_code == 403
    r = api.get(f"/api/v1/labs/?student={student.id}")
    assert r.data["count"] == 1 and r.data["results"][0]["owner"]["name"] == "Aliyev Vali"
    # Boshqa o'qituvchi va boshqa o'quvchi ko'rmaydi
    auth(api, other_teacher)
    assert api.get(f"/api/v1/labs/{lab_id}/").status_code == 404
    assert api.get(f"/api/v1/labs/?student={student.id}").data["count"] == 0
    stranger = make_user(username="begona")
    auth(api, stranger)
    assert api.get(f"/api/v1/labs/{lab_id}/").status_code == 404


def test_update_conclusion_and_delete(api, auth, student):
    auth(api, student)
    lab_id = api.post("/api/v1/labs/", payload(), format="json").data["id"]
    r = api.patch(f"/api/v1/labs/{lab_id}/", {"conclusion": "g ≈ 9.8 m/s²"}, format="json")
    assert r.status_code == 200 and r.data["conclusion"] == "g ≈ 9.8 m/s²"
    assert api.delete(f"/api/v1/labs/{lab_id}/").status_code == 204


def test_analyze_endpoint_custom_axes(api, auth, student):
    auth(api, student)
    lab_id = api.post("/api/v1/labs/", payload(), format="json").data["id"]
    r = api.post(f"/api/v1/labs/{lab_id}/analyze/", {"x": 0, "y": 3, "xp": 1, "yp": 1}, format="json")
    assert r.status_code == 200 and "derived" not in r.data  # andozadan farqli o'qlar
    r = api.post(f"/api/v1/labs/{lab_id}/analyze/", {"x": 0, "y": 3, "xp": 1, "yp": 7}, format="json")
    assert r.status_code == 400


def test_export_csv(api, auth, student):
    auth(api, student)
    lab_id = api.post("/api/v1/labs/", payload(), format="json").data["id"]
    r = api.get(f"/api/v1/labs/{lab_id}/export/")
    assert r.status_code == 200 and r["Content-Type"].startswith("text/csv")
    text = r.content.decode("utf-8")
    assert text.startswith("﻿#;L (m);")
    assert "0,5;10;9,81" in text


def test_list_filter_by_simulation(api, auth, student):
    auth(api, student)
    api.post("/api/v1/labs/", payload(), format="json")
    api.post("/api/v1/labs/", payload(simulation="om_qonuni", rows=[[6, 10, 0.6, 3.6]]), format="json")
    assert api.get("/api/v1/labs/").data["count"] == 2
    assert api.get("/api/v1/labs/?simulation=om_qonuni").data["count"] == 1


# ---------- Tahlil funksiyalari (unit) ----------
def test_safe_eval_blocks_code():
    assert safe_eval("4*pi**2/k", {"k": 4, "pi": math.pi}) == pytest.approx(math.pi ** 2)
    for bad in ("__import__('os')", "k.__class__", "open('x')", "[1,2]"):
        with pytest.raises(ValueError):
            safe_eval(bad, {"k": 1})


def test_linfit_edge_cases():
    assert linfit([1], [2]) is None
    assert linfit([1, 1, 1], [1, 2, 3]) is None
    f = linfit([0, 1, 2], [1, 3, 5])
    assert f["k"] == pytest.approx(2) and f["b"] == pytest.approx(1) and f["r2"] == pytest.approx(1)


def test_analyze_unknown_axes():
    assert "error" in analyze([[1, 2]], [{"key": "a", "label": "a", "type": "number"}] * 2, None, {"x": "zz"})

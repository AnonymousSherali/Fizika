"""4-bosqich: dars ishlanmalar (FT-7), tarjimalar, parametrlangan masalalar (FT-6.2), audit (FT-11)."""
import io
import zipfile
from datetime import timedelta

import pytest
from django.core.exceptions import PermissionDenied
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.audit.tasks import purge_old_audit
from apps.content.models import LessonPlan, Translation
from apps.quizzes.models import Attempt, Problem

from .conftest import make_user
from .test_assignments import lab_payload, pendulum_journal

pytestmark = pytest.mark.django_db

PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


def docx_bytes(macro=False):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("[Content_Types].xml", "<Types/>")
        z.writestr("word/document.xml", "<w:document/>")
        if macro:
            z.writestr("word/vbaProject.bin", b"x")
    return buf.getvalue()


# ---------- Dars ishlanmalar ----------
def test_public_list_from_import(api):
    r = api.get("/api/v1/lesson-plans/?page_size=50")
    assert r.status_code == 200 and r.data["count"] == 22
    assert api.get("/api/v1/lesson-plans/?grade=11&has_model=1").data["count"] >= 4
    assert api.get("/api/v1/lesson-plans/?q=linza").data["count"] == 1


def test_download_counts_and_redirects(api, settings):
    settings.SITE_URL = "https://maktab.uz/"
    plan = LessonPlan.objects.filter(static_docx__gt="").first()
    r = api.get(f"/api/v1/lesson-plans/{plan.id}/download/?type=docx")
    assert r.status_code == 302 and r["Location"] == "https://maktab.uz/" + plan.static_docx
    plan.refresh_from_db()
    assert plan.downloads == 1
    no_docx = LessonPlan.objects.filter(static_docx="").first()
    assert api.get(f"/api/v1/lesson-plans/{no_docx.id}/download/?type=docx").status_code == 404


def test_teacher_upload_moderation_flow(api, auth, teacher, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    auth(api, teacher)
    r = api.post("/api/v1/lesson-plans/", {"title_uz": "Arximed kuchi", "grade": 10, "lesson_type": "Laboratoriya",
                                           "pdf": SimpleUploadedFile("arximed.pdf", PDF),
                                           "docx": SimpleUploadedFile("arximed.docx", docx_bytes())}, format="multipart")
    assert r.status_code == 201, r.data
    pid = r.data["id"]
    assert r.data["status"] == "review" and r.data["has_docx"] is True
    # Moderatsiyagacha hammaga ko'rinmaydi
    api.credentials()
    assert api.get(f"/api/v1/lesson-plans/{pid}/").status_code == 404
    admin = make_user(role="admin", username="moderator")
    auth(api, admin)
    r = api.post(f"/api/v1/lesson-plans/{pid}/moderate/", {"action": "publish"}, format="json")
    assert r.status_code == 200 and r.data["status"] == "published"
    api.credentials()
    r = api.get(f"/api/v1/lesson-plans/{pid}/download/?type=pdf")
    # Yuklangan fayl maxfiy papkadan API orqali beriladi (media havolasiga yo'naltirilmaydi)
    assert r.status_code == 200 and b"".join(r.streaming_content).startswith(b"%PDF")
    assert "attachment" in r["Content-Disposition"]
    plan = LessonPlan.objects.get(pk=pid)
    assert plan.pdf.name.startswith("private/lesson_plans/") and "arximed" not in plan.pdf.name
    assert AuditLog.objects.filter(action="lesson_plan.publish").exists()
    # Nashr etilganini muallif o'chira olmaydi
    auth(api, teacher)
    assert api.delete(f"/api/v1/lesson-plans/{pid}/").status_code == 403


@pytest.mark.parametrize(("name", "content", "field"), [
    ("virus.pdf", b"MZ\x90\x00 exe", "pdf"),                    # kengaytma .pdf, ichi .exe
    ("doc.docx", b"not a zip", "docx"),
    ("macro.docx", None, "docx"),
    ("notes.txt", PDF, "pdf"),
])
def test_upload_validation(api, auth, teacher, settings, tmp_path, name, content, field):
    settings.MEDIA_ROOT = tmp_path
    auth(api, teacher)
    if content is None:
        content = docx_bytes(macro=True)
    files = {"pdf": SimpleUploadedFile("ok.pdf", PDF)}
    files[field] = SimpleUploadedFile(name, content)
    r = api.post("/api/v1/lesson-plans/", {"title_uz": "X", "grade": 10, **files}, format="multipart")
    assert r.status_code == 400 and field in r.data["error"]["fields"]


def test_upload_size_limit(api, auth, teacher, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.LESSON_PDF_MAX_MB = 0.0001
    auth(api, teacher)
    r = api.post("/api/v1/lesson-plans/", {"title_uz": "X", "grade": 10,
                                           "pdf": SimpleUploadedFile("big.pdf", PDF + b"0" * 500)}, format="multipart")
    assert r.status_code == 400


def test_students_cannot_upload(api, auth, student):
    auth(api, student)
    r = api.post("/api/v1/lesson-plans/", {"title_uz": "X", "grade": 10,
                                           "pdf": SimpleUploadedFile("a.pdf", PDF)}, format="multipart")
    assert r.status_code == 403


def test_import_lesson_plans_idempotent(db):
    call_command("import_lesson_plans", verbosity=0)
    assert LessonPlan.objects.count() == 22


# ---------- Tarjimalar ----------
def test_ru_js_endpoint(api):
    Translation.objects.create(key="Salom", ru="Привет")
    Translation.objects.create(key="Bo'sh", ru="")
    r = api.get("/api/v1/i18n/ru.js")
    assert r.status_code == 200 and r["Content-Type"].startswith("application/javascript")
    body = r.content.decode()
    assert body.startswith("/*") and '"Salom":"Привет"' in body and "Bo'sh" not in body


def test_import_and_export_i18n(tmp_path):
    (tmp_path / "i18n-ru.js").write_text('/* x */\nwindow.FIZIKA_RU = {"Kirish":"Вход","Chiqish":"Выход"};\n', encoding="utf-8")
    call_command("import_i18n", frontend=str(tmp_path), verbosity=0)
    assert Translation.objects.get(key="Kirish").ru == "Вход"
    Translation.objects.filter(key="Chiqish").update(ru="Выйти")
    call_command("export_i18n", frontend=str(tmp_path), verbosity=0)
    assert '"Chiqish":"Выйти"' in (tmp_path / "i18n-ru.js").read_text(encoding="utf-8")


# ---------- Parametrlangan masalalar ----------
def param_problem(api, auth, teacher):
    auth(api, teacher)
    r = api.post("/api/v1/quiz/problems/", {
        "topic": "om_qonuni", "text_uz": "U = {U} V, R = {R} Ω. Tok kuchi I = ?", "answer": 0, "unit": "A",
        "tolerance_pct": 1, "params": {"U": [2, 12, 2], "R": [5, 20, 5]}, "formula": "U/R",
        "solution_uz": "I = U/R = {U}/{R} = {answer} A"}, format="json")
    assert r.status_code == 201, r.data
    return r.data["id"]


def test_param_problem_validation(api, auth, teacher):
    auth(api, teacher)
    base = {"topic": "om_qonuni", "text_uz": "U = {U}", "answer": 0, "unit": "A", "tolerance_pct": 1}
    assert api.post("/api/v1/quiz/problems/", {**base, "params": {"U": [2, 12, 0]}, "formula": "U"},
                    format="json").status_code == 400
    assert api.post("/api/v1/quiz/problems/", {**base, "params": {"U": [2, 12, 1]}},
                    format="json").status_code == 400
    assert api.post("/api/v1/quiz/problems/", {**base, "params": {"U": [2, 12, 1]}, "formula": "__import__('os')"},
                    format="json").status_code == 400
    r = api.post("/api/v1/quiz/problems/", {**base, "text_uz": "Matnda joy yo'q", "params": {"U": [2, 12, 1]},
                                            "formula": "U"}, format="json")
    assert r.status_code == 400 and "text_uz" in r.data["error"]["fields"]


def test_param_problem_in_attempt(api, auth, teacher, student, classroom):
    pid = param_problem(api, auth, teacher)
    Problem.objects.filter(pk=pid).update(status="approved")
    Problem.objects.filter(topic__key="om_qonuni").exclude(pk=pid).update(status="archived")
    auth(api, student)
    r = api.post("/api/v1/quiz/attempts/", {"topics": ["om_qonuni"], "count": 0, "problems": 1}, format="json")
    assert r.status_code == 201, r.data
    text = r.data["items"][0]["text"]
    att = Attempt.objects.get(pk=r.data["id"])
    it = att.items.get()
    u, rr = it.params["U"], it.params["R"]
    assert 2 <= u <= 12 and rr in (5, 10, 15, 20) and it.answer_value == pytest.approx(u / rr)
    assert f"U = {u:g}".replace(".", ",") in text and "{" not in text
    # Asl "answer" (0) emas — shu o'quvchining sonlari bo'yicha tekshiriladi
    wrong = api.post(f"/api/v1/quiz/attempts/{att.id}/answer/", {"item_id": 0, "answer": "0"}, format="json")
    assert wrong.data["is_correct"] is False
    att2 = Attempt.objects.get(pk=api.post("/api/v1/quiz/attempts/", {"topics": ["om_qonuni"], "count": 0, "problems": 1},
                                           format="json").data["id"])
    it2 = att2.items.get()
    ok = api.post(f"/api/v1/quiz/attempts/{att2.id}/answer/", {"item_id": 0, "answer": str(it2.answer_value)},
                  format="json")
    assert ok.data["is_correct"] is True
    res = api.post(f"/api/v1/quiz/attempts/{att.id}/finish/").data
    assert "{" not in res["review"][0]["explanation"] and res["review"][0]["correct"].endswith(" A")


# ---------- Audit ----------
def test_audit_grade_before_after(api, auth, teacher, student, classroom):
    auth(api, teacher)
    aid = api.post("/api/v1/assignments/", lab_payload(classroom), format="json").data["id"]
    auth(api, student)
    jid = pendulum_journal(api)
    sid = api.post(f"/api/v1/assignments/{aid}/submit/", {"lab_journal_id": jid, "conclusion": "x" * 30},
                   format="json").data["id"]
    auth(api, teacher)
    api.post(f"/api/v1/submissions/{sid}/grade/", {"grade": 4}, format="json")
    api.post(f"/api/v1/submissions/{sid}/grade/", {"grade": 5}, format="json")
    logs = list(AuditLog.objects.filter(action="grade.set").order_by("created_at"))
    assert len(logs) == 2 and logs[1].before["grade"] == 4 and logs[1].after["grade"] == 5
    assert logs[1].actor_id == teacher.id and logs[1].object_id == sid


def test_audit_login_and_immutable(api, student):
    api.post("/api/v1/auth/login/", {"login": "aliyev.vali", "password": "xato"}, format="json")
    api.post("/api/v1/auth/login/", {"login": "aliyev.vali", "password": "Fizika-2026!"}, format="json")
    assert set(AuditLog.objects.values_list("action", flat=True)) >= {"auth.login_failed", "auth.login"}
    log = AuditLog.objects.first()
    log.action = "boshqa"
    with pytest.raises(PermissionDenied):
        log.save()


def test_audit_retention():
    AuditLog.objects.create(action="eski")
    AuditLog.objects.create(action="yangi")
    AuditLog.objects.filter(action="eski").update(created_at=timezone.now() - timedelta(days=400))
    assert purge_old_audit() == 1
    assert list(AuditLog.objects.values_list("action", flat=True)) == ["yangi"]


def test_audit_admin_readonly(client):
    admin = make_user(role="admin", username="root", is_staff=True, is_superuser=True)
    client.force_login(admin)
    AuditLog.objects.create(action="x")
    log = AuditLog.objects.get()
    assert client.get("/admin/audit/auditlog/").status_code == 200
    assert client.get("/admin/audit/auditlog/add/").status_code == 403
    assert client.post(f"/admin/audit/auditlog/{log.id}/delete/", {"post": "yes"}).status_code == 403

"""Admin panel: 2FA (FT-10.4), kirish va bosh sahifa."""
import io

import pytest
from django.core.management import CommandError, call_command
from django.test import RequestFactory
from django_otp.plugins.otp_totp.models import TOTPDevice

from .conftest import PASSWORD, make_user

pytestmark = pytest.mark.django_db


def test_admin_2fa_setup_command():
    admin = make_user(role="admin", username="bosh.admin", is_staff=True, is_superuser=True)
    out = io.StringIO()
    call_command("admin_2fa_setup", "bosh.admin", stdout=out)
    assert "otpauth://totp/" in out.getvalue()
    assert TOTPDevice.objects.filter(user=admin, confirmed=True).count() == 1
    with pytest.raises(CommandError):
        call_command("admin_2fa_setup", "bosh.admin", stdout=io.StringIO())
    call_command("admin_2fa_setup", "bosh.admin", "--reset", stdout=io.StringIO())
    assert TOTPDevice.objects.filter(user=admin).count() == 1
    with pytest.raises(CommandError):
        call_command("admin_2fa_setup", "oddiy.oquvchi.yoq", stdout=io.StringIO())


def test_otp_admin_site_requires_second_factor(settings):
    from apps.core.admin_site import FizikaAdminSite

    settings.ADMIN_2FA = True
    admin = make_user(role="admin", username="root2", is_staff=True, is_superuser=True)
    req = RequestFactory().get("/admin/")
    req.user = admin
    req.user.is_verified = lambda: False  # parol to'g'ri, lekin TOTP kiritilmagan
    assert FizikaAdminSite().has_permission(req) is False
    req.user.is_verified = lambda: True
    assert FizikaAdminSite().has_permission(req) is True
    settings.ADMIN_2FA = False
    req.user.is_verified = lambda: False
    assert FizikaAdminSite().has_permission(req) is True


def test_admin_login_asks_totp_code_and_rejects_wrong_one(client, settings):
    settings.ADMIN_2FA = True
    make_user(role="admin", username="root3", is_staff=True, is_superuser=True)
    call_command("admin_2fa_setup", "root3", stdout=io.StringIO())
    page = client.get("/admin/login/")
    assert b'name="otp_token"' in page.content
    r = client.post("/admin/login/", {"username": "root3", "password": PASSWORD, "otp_token": "000000"})
    assert r.status_code == 200 and b"otp_token" in r.content  # qayta login sahifasi
    assert client.get("/admin/").status_code == 302


def test_admin_login_with_valid_totp_and_dashboard(client, settings):
    from django_otp.oath import totp
    from django_otp.plugins.otp_totp.models import TOTPDevice

    settings.ADMIN_2FA = True
    make_user(role="admin", username="root4", is_staff=True, is_superuser=True)
    call_command("admin_2fa_setup", "root4", stdout=io.StringIO())
    dev = TOTPDevice.objects.get(user__username="root4")
    code = f"{totp(dev.bin_key, dev.step, dev.t0, dev.digits):06d}"
    r = client.post("/admin/login/", {"username": "root4", "password": PASSWORD, "otp_token": code})
    assert r.status_code == 302
    page = client.get("/admin/")
    assert page.status_code == 200
    html = page.content.decode()
    assert "chiqish kutilmoqda" in html and "30 kun faolligi" in html and "O&#x27;quvchilar" in html
    # Barcha ro'yxat sahifalari xatosiz ochiladi
    for url in ["/admin/accounts/user/", "/admin/quizzes/question/", "/admin/content/lessonplan/",
                "/admin/assignments/submission/", "/admin/audit/auditlog/", "/admin/auth/group/",
                "/admin/otp_totp/totpdevice/", "/admin/accounts/user/add/"]:
        assert client.get(url).status_code == 200, url

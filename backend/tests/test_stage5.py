"""5-bosqich: admin 2FA (FT-10.4), backup skripti mavjudligi."""
import io

import pytest
from django.core.management import CommandError, call_command
from django.test import RequestFactory
from django_otp.admin import OTPAdminSite
from django_otp.plugins.otp_totp.models import TOTPDevice

from .conftest import make_user

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


def test_otp_admin_site_requires_second_factor():
    admin = make_user(role="admin", username="root2", is_staff=True, is_superuser=True)
    req = RequestFactory().get("/admin/")
    req.user = admin
    req.user.is_verified = lambda: False  # parol to'g'ri, lekin TOTP kiritilmagan
    assert OTPAdminSite().has_permission(req) is False
    req.user.is_verified = lambda: True
    assert OTPAdminSite().has_permission(req) is True

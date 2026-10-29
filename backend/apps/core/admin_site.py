"""
Admin panel sayti (FT-10): Unfold mavzusi va ixtiyoriy ikki bosqichli kirish (FT-10.4).

`ADMIN_2FA=true` bo'lsa login sahifasida parol bilan birga ilovadagi 6 xonali kod so'raladi va faqat
TOTP bilan tasdiqlangan sessiya admin panelga kira oladi (django-otp `OTPAdminSite` bilan bir xil qoida).
"""
from django import forms
from django.conf import settings
from django_otp.admin import OTPAdminAuthenticationForm
from unfold.forms import AuthenticationForm
from unfold.sites import UnfoldAdminSite
from unfold.widgets import BASE_INPUT_CLASSES


def _style(form):
    form.fields["username"].label = "Login, telefon yoki email"
    form.fields["username"].widget.attrs.update(autofocus="", **{"class": " ".join(BASE_INPUT_CLASSES)})
    form.fields["password"].widget.attrs["class"] = " ".join(BASE_INPUT_CLASSES)


class LoginForm(AuthenticationForm):
    def __init__(self, request=None, *args, **kwargs):
        super().__init__(request, *args, **kwargs)
        _style(self)


class OTPLoginForm(OTPAdminAuthenticationForm):
    # Har bir administratorda bitta qurilma: kod barcha qurilmalari bo'yicha tekshiriladi, tanlash shart emas
    otp_device = forms.CharField(required=False, widget=forms.HiddenInput)
    otp_token = forms.CharField(
        label="Tasdiqlash kodi", required=False,
        help_text="Google Authenticator (yoki boshqa TOTP ilova) dagi 6 xonali kod",
        widget=forms.TextInput(attrs={"autocomplete": "one-time-code", "inputmode": "numeric",
                                      "maxlength": "6", "class": " ".join(BASE_INPUT_CLASSES)}),
    )

    def __init__(self, request=None, *args, **kwargs):
        super().__init__(request, *args, **kwargs)
        _style(self)


class FizikaAdminSite(UnfoldAdminSite):
    site_header = "Fizika 10–11"
    site_title = "Fizika 10–11 boshqaruvi"
    index_title = "Boshqaruv paneli"

    def login(self, request, extra_context=None):
        # Sozlama testlarda ham o'zgartirilishi mumkin — har so'rovda tanlanadi
        self.login_form = OTPLoginForm if settings.ADMIN_2FA else LoginForm
        return super().login(request, extra_context)

    def has_permission(self, request):
        ok = super().has_permission(request)
        if ok and settings.ADMIN_2FA:
            return bool(getattr(request.user, "is_verified", lambda: False)())
        return ok

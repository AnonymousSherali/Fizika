from django.apps import AppConfig
from django.contrib.admin import apps as admin_apps


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = "Umumiy"


class FizikaAdminConfig(admin_apps.AdminConfig):
    """Admin panel: Unfold ko'rinishi + (production'da) TOTP 2FA — `apps.core.admin_site`."""

    default = False  # INSTALLED_APPS da to'liq yo'l bilan ko'rsatiladi
    default_site = "apps.core.admin_site.FizikaAdminSite"

from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django_otp.plugins.otp_totp.admin import TOTPDeviceAdmin as BaseTOTPDeviceAdmin
from django_otp.plugins.otp_totp.models import TOTPDevice
from unfold.admin import ModelAdmin
from unfold.decorators import display
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import LoginEvent, User, VerificationCode

ROLE_COLORS = {"student": "info", "teacher": "success", "school_admin": "warning", "admin": "danger"}


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
    list_display = ["username", "last_name", "first_name", "role_label", "school", "is_verified", "is_active",
                    "last_login"]
    list_filter = ["role", "is_verified", "is_active", "language"]
    search_fields = ["username", "first_name", "last_name", "phone", "email"]
    autocomplete_fields = ["school"]
    ordering = ["last_name", "first_name"]
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Shaxsiy ma'lumotlar", {"fields": ("first_name", "last_name", "phone", "email", "school")}),
        ("Platforma", {"fields": ("role", "language", "theme", "is_verified", "must_change_password",
                                  "deletion_requested_at")}),
        ("Huquqlar", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Sanalar", {"fields": ("last_login", "date_joined")}),
    )

    @display(description="rol", ordering="role", label=ROLE_COLORS)
    def role_label(self, obj):
        return obj.role, obj.get_role_display()

    def save_model(self, request, obj, form, change):
        from apps.audit import services as audit

        before = None
        if change and obj.pk:
            old = User.objects.filter(pk=obj.pk).values("role", "is_active", "is_superuser", "is_staff").first()
            before = old
        super().save_model(request, obj, form, change)
        after = {"role": obj.role, "is_active": obj.is_active, "is_superuser": obj.is_superuser, "is_staff": obj.is_staff}
        if before != after:
            audit.log(request, "user.permissions_changed" if change else "user.created_by_admin", obj,
                      before=before, after=after)

    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("username", "role", "password1", "password2")}),
    )


@admin.register(LoginEvent)
class LoginEventAdmin(ModelAdmin):
    list_display = ["created_at", "login", "user", "ip", "success"]
    list_filter = ["success"]
    search_fields = ["login", "ip"]
    readonly_fields = [f.name for f in LoginEvent._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(VerificationCode)
class VerificationCodeAdmin(ModelAdmin):
    list_display = ["created_at", "user", "purpose", "channel", "target", "attempts", "used_at"]
    readonly_fields = [f.name for f in VerificationCode._meta.fields if f.name != "code_hash"]
    exclude = ["code_hash"]

    def has_add_permission(self, request):
        return False


# Django va django-otp'ning standart admin sahifalari ham Unfold ko'rinishida
admin.site.unregister(Group)
admin.site.unregister(TOTPDevice)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass


@admin.register(TOTPDevice)
class TOTPDeviceAdmin(BaseTOTPDeviceAdmin, ModelAdmin):
    pass

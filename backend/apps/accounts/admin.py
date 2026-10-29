from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import LoginEvent, User, VerificationCode


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "last_name", "first_name", "role", "school", "is_verified", "is_active",
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
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("username", "role", "password1", "password2")}),
    )


@admin.register(LoginEvent)
class LoginEventAdmin(admin.ModelAdmin):
    list_display = ["created_at", "login", "user", "ip", "success"]
    list_filter = ["success"]
    search_fields = ["login", "ip"]
    readonly_fields = [f.name for f in LoginEvent._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(VerificationCode)
class VerificationCodeAdmin(admin.ModelAdmin):
    list_display = ["created_at", "user", "purpose", "channel", "target", "attempts", "used_at"]
    readonly_fields = [f.name for f in VerificationCode._meta.fields if f.name != "code_hash"]
    exclude = ["code_hash"]

    def has_add_permission(self, request):
        return False

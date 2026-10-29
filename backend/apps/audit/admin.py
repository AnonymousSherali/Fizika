from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Faqat o'qish: qo'shish, o'zgartirish va o'chirish taqiqlangan (FT-11.3)."""

    list_display = ["created_at", "action", "actor", "object_type", "object_id", "ip"]
    list_filter = ["action", "object_type"]
    search_fields = ["action", "object_id", "actor__username", "ip"]
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

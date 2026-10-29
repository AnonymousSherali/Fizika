from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = ["created_at", "user", "type", "title", "is_read", "emailed_at"]
    list_filter = ["type", "is_read"]
    search_fields = ["title", "user__username"]
    raw_id_fields = ["user"]

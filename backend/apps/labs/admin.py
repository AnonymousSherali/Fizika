from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import LabJournal


@admin.register(LabJournal)
class LabJournalAdmin(ModelAdmin):
    list_display = ["updated_at", "user", "simulation", "title", "device"]
    list_filter = ["simulation", "device"]
    search_fields = ["user__username", "user__last_name", "title"]
    raw_id_fields = ["user"]
    readonly_fields = ["client_id", "analysis", "created_at", "updated_at"]

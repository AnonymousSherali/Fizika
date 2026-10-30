from django.contrib import admin
from unfold.admin import ModelAdmin, StackedInline, TabularInline

from .models import LabSchema, Simulation, SimulationExpected, SimulationTask


class TaskInline(TabularInline):
    model = SimulationTask
    extra = 0


class ExpectedInline(TabularInline):
    model = SimulationExpected
    extra = 0


class SchemaInline(StackedInline):
    model = LabSchema
    extra = 0


@admin.register(Simulation)
class SimulationAdmin(ModelAdmin):
    list_display = ["order", "title_uz", "category", "grade", "slug", "is_active"]
    list_display_links = ["title_uz"]
    list_editable = ["order", "is_active"]
    list_filter = ["category", "grade", "is_active"]
    search_fields = ["title_uz", "title_ru", "slug"]
    inlines = [TaskInline, ExpectedInline, SchemaInline]

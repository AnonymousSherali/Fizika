from django.contrib import admin

from .models import LabSchema, Simulation, SimulationExpected, SimulationTask


class TaskInline(admin.TabularInline):
    model = SimulationTask
    extra = 0


class ExpectedInline(admin.TabularInline):
    model = SimulationExpected
    extra = 0


class SchemaInline(admin.StackedInline):
    model = LabSchema
    extra = 0


@admin.register(Simulation)
class SimulationAdmin(admin.ModelAdmin):
    list_display = ["order", "title_uz", "category", "grade", "slug", "is_active"]
    list_display_links = ["title_uz"]
    list_editable = ["order", "is_active"]
    list_filter = ["category", "grade", "is_active"]
    search_fields = ["title_uz", "title_ru", "slug"]
    inlines = [TaskInline, ExpectedInline, SchemaInline]

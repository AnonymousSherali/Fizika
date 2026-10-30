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
    """Jurnal sxemalari sahifadan import qilinadi (manage.py import_simulations) va saqlangan jurnallar ularga
    bog'liq — admin panelda faqat ko'riladi: o'chirish/tahrirlash eski jurnallarni ochilmaydigan qilardi."""

    model = LabSchema
    extra = 0
    readonly_fields = ["version", "columns"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Simulation)
class SimulationAdmin(ModelAdmin):
    list_display = ["order", "title_uz", "category", "grade", "slug", "is_active"]
    list_display_links = ["title_uz"]
    list_editable = ["order", "is_active"]
    list_filter = ["category", "grade", "is_active"]
    search_fields = ["title_uz", "title_ru", "slug"]
    inlines = [TaskInline, ExpectedInline, SchemaInline]
    # Tahlil andozasi sahifadan import qilinadi; qo'lda buzilsa jurnal saqlash ishlamay qolardi.
    # slug/sahifa yo'li mavjud modelda o'zgarmaydi (jurnallar va topshiriqlar shunga bog'langan)
    def get_readonly_fields(self, request, obj=None):
        return ["slug", "page_path", "analysis"] if obj else ["analysis"]

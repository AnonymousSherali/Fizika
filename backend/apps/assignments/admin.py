from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from .models import Assignment, Submission


class SubmissionInline(TabularInline):
    model = Submission
    extra = 0
    fields = ["student", "status", "submitted_at", "is_late", "suggested_grade", "grade"]
    readonly_fields = fields
    can_delete = False


@admin.register(Assignment)
class AssignmentAdmin(ModelAdmin):
    list_display = ["title", "type", "teacher", "simulation", "due_at", "created_at"]
    list_filter = ["type", "grading_scale"]
    search_fields = ["title", "teacher__last_name"]
    raw_id_fields = ["teacher"]
    filter_horizontal = ["classrooms"]
    inlines = [SubmissionInline]


@admin.register(Submission)
class SubmissionAdmin(ModelAdmin):
    list_display = ["assignment", "student", "status_label", "is_late", "suggested_grade", "grade", "submitted_at"]
    list_filter = ["status", "is_late"]
    raw_id_fields = ["student", "lab_journal", "attempt", "graded_by"]

    @display(description="holat", ordering="status",
             label={"submitted": "warning", "graded": "success", "returned": "danger"})
    def status_label(self, obj):
        return obj.status, obj.get_status_display()

from django.contrib import admin

from apps.audit import services as audit

from .models import LessonPlan, Translation


@admin.register(LessonPlan)
class LessonPlanAdmin(admin.ModelAdmin):
    list_display = ["title_uz", "grade", "status", "author", "downloads", "created_at"]
    list_filter = ["status", "grade"]
    search_fields = ["title_uz", "title_ru"]
    raw_id_fields = ["author"]
    actions = ["publish", "reject"]

    @admin.action(description="Nashr etish")
    def publish(self, request, queryset):
        for p in queryset:
            audit.log(request, "lesson_plan.publish", p, before={"status": p.status})
        queryset.update(status=LessonPlan.Status.PUBLISHED)

    @admin.action(description="Rad etish")
    def reject(self, request, queryset):
        for p in queryset:
            audit.log(request, "lesson_plan.reject", p, before={"status": p.status})
        queryset.update(status=LessonPlan.Status.REJECTED)


@admin.register(Translation)
class TranslationAdmin(admin.ModelAdmin):
    list_display = ["key_short", "ru", "updated_at"]
    search_fields = ["key", "ru"]
    list_per_page = 50

    @admin.display(description="o'zbekcha")
    def key_short(self, obj):
        return obj.key[:90]

    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)

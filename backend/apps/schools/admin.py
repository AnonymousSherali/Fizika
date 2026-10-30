from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from .models import Classroom, ClassroomMember, School


@admin.register(School)
class SchoolAdmin(ModelAdmin):
    list_display = ["name", "number", "region", "district", "is_verified"]
    list_filter = ["region", "is_verified"]
    search_fields = ["name", "number", "district"]
    actions = ["verify"]

    @admin.action(description="Tanlangan maktablarni tasdiqlash")
    def verify(self, request, queryset):
        queryset.update(is_verified=True)


class MemberInline(TabularInline):
    model = ClassroomMember
    extra = 0
    autocomplete_fields = ["user"]


@admin.register(Classroom)
class ClassroomAdmin(ModelAdmin):
    list_display = ["name", "grade", "academic_year", "school", "join_code", "is_archived"]
    list_filter = ["grade", "academic_year", "is_archived"]
    search_fields = ["name", "join_code", "school__name"]
    autocomplete_fields = ["school"]
    inlines = [MemberInline]

    def has_delete_permission(self, request, obj=None):
        # Sinf o'chirilmaydi — arxivlanadi (FT-2.6): o'chirish o'quvchilarning topshiriqlarga kirishini yo'qotardi
        return False

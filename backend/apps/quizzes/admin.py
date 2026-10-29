from django.contrib import admin

from .models import Attempt, AttemptItem, Problem, Question, Status, Topic


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ["order", "key", "title_uz", "title_ru", "simulation"]
    list_display_links = ["key"]
    list_editable = ["order"]


class _BankAdmin(admin.ModelAdmin):
    list_filter = ["status", "topic"]
    search_fields = ["text_uz", "text_ru"]
    raw_id_fields = ["author"]
    actions = ["approve", "archive"]

    @admin.action(description="Tasdiqlash")
    def approve(self, request, queryset):
        queryset.update(status=Status.APPROVED)

    @admin.action(description="Arxivlash")
    def archive(self, request, queryset):
        queryset.update(status=Status.ARCHIVED)

    @admin.display(description="to'g'ri %")
    def accuracy(self, obj):
        return f"{obj.stats_correct / obj.stats_total * 100:.0f}%" if obj.stats_total else "—"


@admin.register(Question)
class QuestionAdmin(_BankAdmin):
    list_display = ["id", "topic", "level", "short", "status", "stats_total", "accuracy"]
    list_filter = ["status", "topic", "level"]

    @admin.display(description="savol")
    def short(self, obj):
        return obj.text_uz[:70]


@admin.register(Problem)
class ProblemAdmin(_BankAdmin):
    list_display = ["id", "topic", "short", "answer", "unit", "tolerance_pct", "status", "accuracy"]

    @admin.display(description="masala")
    def short(self, obj):
        return obj.text_uz[:70]


class ItemInline(admin.TabularInline):
    model = AttemptItem
    extra = 0
    readonly_fields = ["order", "question", "problem", "option_order", "given_answer", "is_correct", "answered_at"]
    can_delete = False


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ["started_at", "user", "assignment", "percent", "grade", "finished_at"]
    list_filter = ["grade"]
    raw_id_fields = ["user", "assignment"]
    inlines = [ItemInline]

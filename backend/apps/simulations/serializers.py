from django.utils.translation import get_language
from rest_framework import serializers

from .models import LabSchema, Simulation


def lang() -> str:
    return "ru" if (get_language() or "uz").startswith("ru") else "uz"


class LabSchemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSchema
        fields = ["version", "columns"]


class SimulationListSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Simulation
        fields = ["slug", "title", "description", "category", "category_name", "grade", "icon",
                  "page_path", "thumbnail", "order"]

    def get_title(self, obj) -> str:
        return obj.localized("title", lang())

    def get_description(self, obj) -> str:
        return obj.localized("description", lang())


class SimulationDetailSerializer(SimulationListSerializer):
    tasks = serializers.SerializerMethodField()
    schema = serializers.SerializerMethodField()

    class Meta(SimulationListSerializer.Meta):
        fields = SimulationListSerializer.Meta.fields + ["tasks", "schema", "analysis"]

    def get_tasks(self, obj) -> list[dict]:
        lg = lang()
        return [{"step": t.step_no, "text": (t.text_ru if lg == "ru" and t.text_ru else t.text_uz)}
                for t in obj.tasks.all()]

    def get_schema(self, obj) -> dict | None:
        s = obj.current_schema
        return LabSchemaSerializer(s).data if s else None


class ExpectedSerializer(serializers.Serializer):
    order = serializers.IntegerField()
    text = serializers.CharField()

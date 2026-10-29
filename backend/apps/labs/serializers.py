import math

from rest_framework import serializers

from apps.simulations.models import LabSchema, Simulation

from .analysis import ALLOWED_POWERS
from .models import MAX_ROWS, LabJournal


class GraphSerializer(serializers.Serializer):
    x = serializers.IntegerField(min_value=0)
    y = serializers.IntegerField(min_value=0)
    xp = serializers.FloatField(default=1)
    yp = serializers.FloatField(default=1)

    def validate(self, data):
        for k in ("xp", "yp"):
            if data[k] not in ALLOWED_POWERS:
                raise serializers.ValidationError({k: ["Daraja faqat 1, 2, 3, 0.5 yoki -1"]})
            if data[k] == int(data[k]):
                data[k] = int(data[k])
        return data


def clean_cell(value, col):
    """Raqamli ustun: son, '4,5' kabi matn yoki bo'sh ('—', null). Matnli ustun: ≤ 60 belgi."""
    if col["type"] == "text":
        return None if value is None else str(value)[:60]
    if value is None or value in ("", "—", "-"):
        return None
    if isinstance(value, bool):
        raise ValueError
    if isinstance(value, int | float):
        f = float(value)
    else:
        f = float(str(value).replace(",", ".").replace("−", "-").strip())
    if not math.isfinite(f):
        raise ValueError
    return int(f) if isinstance(value, int) else f


class LabJournalSerializer(serializers.ModelSerializer):
    simulation = serializers.SlugRelatedField(slug_field="slug", queryset=Simulation.objects.filter(is_active=True))
    graph = GraphSerializer(required=False, allow_null=True)
    rows_count = serializers.SerializerMethodField()
    simulation_title = serializers.CharField(source="simulation.title_uz", read_only=True)
    columns = serializers.SerializerMethodField()

    class Meta:
        model = LabJournal
        fields = ["id", "client_id", "simulation", "simulation_title", "schema_version", "columns", "title",
                  "rows", "rows_count", "graph", "analysis", "conclusion", "device", "created_at", "updated_at"]
        read_only_fields = ["id", "analysis", "created_at", "updated_at"]

    def get_rows_count(self, obj) -> int:
        return len(obj.rows)

    def get_columns(self, obj) -> list[dict]:
        schema = LabSchema.objects.filter(simulation=obj.simulation, version=obj.schema_version).first()
        return schema.columns if schema else []

    def validate(self, data):
        sim = data.get("simulation") or getattr(self.instance, "simulation", None)
        version = data.get("schema_version") or getattr(self.instance, "schema_version", None)
        schema = None
        if sim:
            schema = (LabSchema.objects.filter(simulation=sim, version=version).first() if version
                      else sim.current_schema)
        if schema is None:
            raise serializers.ValidationError({"schema_version": ["Bu model uchun jurnal sxemasi topilmadi"]})
        data["schema_version"] = schema.version
        cols = schema.columns
        if "rows" in data:
            rows = data["rows"]
            if not isinstance(rows, list):
                raise serializers.ValidationError({"rows": ["Qatorlar ro'yxat bo'lishi kerak"]})
            if len(rows) > MAX_ROWS:
                raise serializers.ValidationError({"rows": [f"Qatorlar soni {MAX_ROWS} tadan oshmasligi kerak"]})
            cleaned = []
            for i, r in enumerate(rows, 1):
                if not isinstance(r, list) or len(r) != len(cols):
                    raise serializers.ValidationError(
                        {"rows": [f"{i}-qator: {len(cols)} ta qiymat bo'lishi kerak"]})
                try:
                    cleaned.append([clean_cell(v, c) for v, c in zip(r, cols, strict=True)])
                except (ValueError, TypeError) as e:
                    raise serializers.ValidationError({"rows": [f"{i}-qator: raqamli ustunda noto'g'ri qiymat"]}) from e
            data["rows"] = cleaned
        graph = data.get("graph")
        if graph and (graph["x"] >= len(cols) or graph["y"] >= len(cols)):
            raise serializers.ValidationError({"graph": ["Ustun raqami sxemadan tashqarida"]})
        self.context["schema"] = schema
        return data


class LabListSerializer(serializers.ModelSerializer):
    simulation = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    simulation_title = serializers.CharField(source="simulation.title_uz", read_only=True)
    rows_count = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()

    class Meta:
        model = LabJournal
        fields = ["id", "client_id", "simulation", "simulation_title", "title", "rows_count", "analysis",
                  "owner", "created_at", "updated_at"]

    def get_rows_count(self, obj) -> int:
        return len(obj.rows)

    def get_owner(self, obj) -> dict:
        return {"id": str(obj.user_id), "name": f"{obj.user.last_name} {obj.user.first_name}".strip()}

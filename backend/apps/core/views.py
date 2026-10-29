from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Monitoring uchun (TZ NF-10): baza va kesh ishlayaptimi."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    @extend_schema(responses={200: dict, 503: dict})
    def get(self, request):
        checks = {}
        try:
            with connection.cursor() as c:
                c.execute("SELECT 1")
            checks["database"] = "ok"
        except Exception:  # noqa: BLE001
            checks["database"] = "error"
        try:
            cache.set("health", 1, 5)
            checks["cache"] = "ok" if cache.get("health") == 1 else "error"
        except Exception:  # noqa: BLE001
            checks["cache"] = "error"
        ok = all(v == "ok" for v in checks.values())
        return Response({"status": "ok" if ok else "degraded", **checks}, status=200 if ok else 503)

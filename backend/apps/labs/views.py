import csv
import io

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.schools.models import ClassroomMember
from apps.simulations.models import LabSchema

from .analysis import analyze
from .models import LabJournal
from .serializers import GraphSerializer, LabJournalSerializer, LabListSerializer

STAFF = (ClassroomMember.Role.TEACHER, ClassroomMember.Role.ASSISTANT)


def teacher_student_ids(user):
    """O'qituvchi sinflaridagi o'quvchilar."""
    classes = ClassroomMember.objects.filter(user=user, role__in=STAFF).values("classroom")
    return ClassroomMember.objects.filter(classroom__in=classes, role=ClassroomMember.Role.STUDENT).values("user")


class LabJournalViewSet(viewsets.ModelViewSet):
    """FT-4.1 – FT-4.6. Egasi to'liq boshqaradi; o'qituvchi o'z o'quvchilarinikini faqat o'qiydi."""

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete"]
    queryset = LabJournal.objects.none()  # OpenAPI uchun (haqiqiy ro'yxat get_queryset da)

    def get_serializer_class(self):
        return LabListSerializer if self.action == "list" else LabJournalSerializer

    def get_queryset(self):
        u = self.request.user
        qs = LabJournal.objects.select_related("simulation", "user")
        p = self.request.query_params
        if p.get("student"):
            if u.is_platform_admin:
                qs = qs.filter(user_id=p["student"])
            elif u.is_teacher:
                qs = qs.filter(user_id=p["student"], user__in=teacher_student_ids(u))
            else:
                qs = qs.none()
        elif u.is_teacher and self.action != "list":
            qs = qs.filter(Q(user=u) | Q(user__in=teacher_student_ids(u)))
        else:
            qs = qs.filter(user=u)
        if p.get("simulation"):
            qs = qs.filter(simulation__slug=p["simulation"])
        return qs

    def _check_owner(self, obj):
        if obj.user_id != self.request.user.id:
            raise PermissionDenied("Faqat jurnal egasi o'zgartira oladi")

    def _run_analysis(self, journal, schema_columns):
        journal.analysis = analyze(journal.rows, schema_columns, journal.graph, journal.simulation.analysis)
        journal.save(update_fields=["analysis", "updated_at"])

    @extend_schema(parameters=[OpenApiParameter("simulation", str),
                               OpenApiParameter("student", str, description="O'qituvchi uchun: o'quvchi id")])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Upsert: shu foydalanuvchida client_id bor bo'lsa — yangilanadi (200), aks holda yaratiladi (201).
        Oflayn navbat bir so'rovni qayta yuborsa ham dublikat paydo bo'lmaydi (FT-4.3)."""
        existing = None
        cid = request.data.get("client_id")
        if cid:
            existing = LabJournal.objects.filter(user=request.user, client_id=cid).first()
        s = LabJournalSerializer(existing, data=request.data, partial=bool(existing),
                                 context=self.get_serializer_context())
        s.is_valid(raise_exception=True)
        if existing and "simulation" in s.validated_data and s.validated_data["simulation"] != existing.simulation:
            return Response({"error": {"code": "conflict", "message": "client_id boshqa modelga tegishli"}},
                            status=status.HTTP_409_CONFLICT)
        journal = s.save(user=request.user) if not existing else s.save()
        self._run_analysis(journal, s.context["schema"].columns)
        out = LabJournalSerializer(journal, context=self.get_serializer_context()).data
        return Response(out, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        self._check_owner(serializer.instance)
        journal = serializer.save()
        self._run_analysis(journal, serializer.context["schema"].columns)

    def perform_destroy(self, instance):
        self._check_owner(instance)
        instance.delete()

    @extend_schema(request=GraphSerializer, responses={200: dict})
    @action(detail=True, methods=["post"])
    def analyze(self, request, pk=None):
        """FT-4.5: serverda grafik tahlili. Tanadan o'q tanlansa — shu bo'yicha, aks holda model andozasi."""
        journal = self.get_object()
        graph = None
        if request.data:
            g = GraphSerializer(data=request.data)
            g.is_valid(raise_exception=True)
            graph = g.validated_data
        schema = LabSchema.objects.get(simulation=journal.simulation, version=journal.schema_version)
        result = analyze(journal.rows, schema.columns, graph or journal.graph, journal.simulation.analysis)
        if journal.user_id == request.user.id:
            if graph:
                journal.graph = graph
            journal.analysis = result
            journal.save(update_fields=["graph", "analysis", "updated_at"])
        return Response(result)

    @extend_schema(parameters=[OpenApiParameter("format", str, enum=["csv"])], responses={200: bytes})
    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        """FT-4.4: CSV (Excel uchun ';' va o'nli vergul — frontenddagi eksport bilan bir xil)."""
        journal = self.get_object()
        schema = LabSchema.objects.get(simulation=journal.simulation, version=journal.schema_version)
        buf = io.StringIO()
        w = csv.writer(buf, delimiter=";", lineterminator="\r\n")
        w.writerow(["#"] + [c["label"] for c in schema.columns])
        for i, r in enumerate(journal.rows, 1):
            w.writerow([i] + ["" if v is None else str(v).replace(".", ",") if isinstance(v, float | int) else v
                              for v in r])
        stamp = timezone.localdate().isoformat()
        resp = HttpResponse("﻿" + buf.getvalue(), content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="{journal.simulation.slug}_jurnal_{stamp}.csv"'
        return resp

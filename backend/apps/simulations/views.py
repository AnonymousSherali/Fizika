from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsTeacher

from .models import Simulation
from .serializers import ExpectedSerializer, SimulationDetailSerializer, SimulationListSerializer, lang


class SimulationViewSet(viewsets.ReadOnlyModelViewSet):
    """FT-3.4: modellar katalogi (hamma uchun ochiq)."""

    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    pagination_class = None

    def get_queryset(self):
        qs = Simulation.objects.filter(is_active=True).prefetch_related("tasks", "schemas")
        p = self.request.query_params
        if p.get("category"):
            qs = qs.filter(category=p["category"])
        if p.get("grade"):
            qs = qs.filter(grade=p["grade"])
        if p.get("q"):
            q = p["q"]
            qs = qs.filter(Q(title_uz__icontains=q) | Q(title_ru__icontains=q) | Q(description_uz__icontains=q)
                           | Q(description_ru__icontains=q))
        return qs

    def get_serializer_class(self):
        return SimulationDetailSerializer if self.action == "retrieve" else SimulationListSerializer

    @extend_schema(parameters=[OpenApiParameter("category", str), OpenApiParameter("grade", int),
                               OpenApiParameter("q", str)])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(responses={200: ExpectedSerializer(many=True)})
    @action(detail=True, methods=["get"], permission_classes=[IsTeacher])
    def expected(self, request, slug=None):
        """O'qituvchi rejimi: kutilgan natijalar (faqat o'qituvchi)."""
        sim = get_object_or_404(Simulation, slug=slug)
        lg = lang()
        data = [{"order": e.order, "text": (e.text_ru if lg == "ru" and e.text_ru else e.text_uz)}
                for e in sim.expected.all()]
        return Response(data)

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.schools.models import ClassroomMember
from apps.schools.views import STAFF_ROLES, staff_classroom

from . import exports, services


class ClassroomSummaryView(APIView):
    """FT-8.1: sinf bo'yicha xulosa — topshiriqlar holati, o'rtacha baho, mavzular, faollik."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: dict})
    def get(self, request, pk):
        return Response(services.classroom_summary(staff_classroom(request.user, pk)))


class ClassroomHeatmapView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: dict})
    def get(self, request, pk):
        return Response(services.classroom_heatmap(staff_classroom(request.user, pk)))


class ClassroomExportView(APIView):
    """FT-8.3: sinf jurnali Excel (.xlsx) — baholar va mavzular bo'yicha natijalar."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"): bytes})
    def get(self, request, pk):
        return exports.classroom_xlsx(staff_classroom(request.user, pk))


class StudentCardView(APIView):
    """FT-8.2: o'quvchi kartasi. Ko'radi: o'quvchining o'zi, uning sinf o'qituvchisi, administrator."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: dict})
    def get(self, request, pk):
        student = get_object_or_404(User, pk=pk)
        u = request.user
        allowed = student.id == u.id or u.is_platform_admin
        if not allowed and u.is_teacher:
            my_classes = ClassroomMember.objects.filter(user=u, role__in=STAFF_ROLES).values("classroom")
            allowed = ClassroomMember.objects.filter(user=student, classroom__in=my_classes).exists()
        if not allowed:
            raise PermissionDenied("Bu o'quvchi sizning sinfingizda emas")
        return Response(services.student_card(student))


class PlatformStatsView(APIView):
    """FT-8.4: administrator statistikasi."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: dict})
    def get(self, request):
        if not request.user.is_platform_admin:
            raise PermissionDenied("Faqat administrator uchun")
        return Response(services.platform_stats())

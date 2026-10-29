from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.labs.models import LabJournal
from apps.notifications import services as notifications

from . import services
from .models import Assignment, Submission
from .serializers import (
    AssignmentSerializer,
    GradeSerializer,
    ReturnSerializer,
    RosterRowSerializer,
    StudentAssignmentSerializer,
    SubmissionSerializer,
    SubmitLabSerializer,
)


def is_staff(user):
    return bool(getattr(user, "is_teacher", False) or getattr(user, "is_platform_admin", False))


class AssignmentViewSet(viewsets.ModelViewSet):
    """FT-5.1 – FT-5.6. O'qituvchi yaratadi va boshqaradi; o'quvchi o'ziga berilganlarini ko'radi."""

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete"]
    queryset = Assignment.objects.none()

    def get_queryset(self):
        u = self.request.user
        qs = services.assignments_for_teacher(u) if is_staff(u) else services.assignments_for_student(u)
        qs = qs.select_related("teacher", "simulation").prefetch_related("classrooms")
        p = self.request.query_params
        if p.get("type"):
            qs = qs.filter(type=p["type"])
        if p.get("classroom"):
            qs = qs.filter(classrooms__id=p["classroom"])
        return qs.order_by("-created_at")

    def get_serializer_class(self):
        if getattr(self, "swagger_fake_view", False):  # OpenAPI sxemasi uchun
            return AssignmentSerializer
        return AssignmentSerializer if is_staff(self.request.user) else StudentAssignmentSerializer

    def _require_owner(self, obj):
        u = self.request.user
        if not (u.is_platform_admin or obj.teacher_id == u.id):
            raise PermissionDenied("Faqat topshiriq muallifi o'zgartira oladi")

    def create(self, request, *args, **kwargs):
        if not is_staff(request.user):
            raise PermissionDenied("Topshiriqni faqat o'qituvchi beradi")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        a = serializer.save(teacher=self.request.user)
        notifications.on_assignment_created(a)

    def perform_update(self, serializer):
        self._require_owner(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_owner(instance)
        instance.delete()

    # ----- O'qituvchi: sinf ro'yxati bo'yicha holat -----
    @extend_schema(responses={200: RosterRowSerializer(many=True)})
    @action(detail=True, methods=["get"])
    def submissions(self, request, pk=None):
        """Barcha o'quvchilar (topshirmaganlar ham) va holatlari — o'qituvchi uchun."""
        a = self.get_object()
        if not is_staff(request.user):
            raise PermissionDenied("Faqat o'qituvchi uchun")
        rows = services.build_roster(a)
        return Response(RosterRowSerializer(rows, many=True).data)

    @extend_schema(responses={(200, "text/csv"): bytes})
    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        """FT-8.3: topshiriq natijalari CSV (Excel uchun ';' ajratuvchi)."""
        a = self.get_object()
        if not is_staff(request.user):
            raise PermissionDenied("Faqat o'qituvchi uchun")
        from apps.analytics.exports import assignment_csv

        return assignment_csv(a, services.build_roster(a))

    # ----- O'quvchi: laboratoriya ishini topshirish -----
    @extend_schema(request=SubmitLabSerializer, responses={200: SubmissionSerializer})
    @action(detail=True, methods=["post"], parser_classes=[JSONParser, MultiPartParser, FormParser])
    def submit(self, request, pk=None):
        a = services.get_for_student(pk, request.user)
        if a.type != Assignment.Type.LAB:
            raise ValidationError("Test topshiriqlari /quiz/attempts/ orqali bajariladi")
        s = SubmitLabSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        journal = get_object_or_404(LabJournal, pk=s.validated_data["lab_journal_id"], user=request.user)
        sub = services.submit_lab(a, request.user, journal, s.validated_data["conclusion"],
                                  s.validated_data.get("image"))
        return Response(SubmissionSerializer(sub, context={"request": request}).data)

    @extend_schema(responses={200: SubmissionSerializer})
    @action(detail=True, methods=["get"], url_path="my-submission")
    def my_submission(self, request, pk=None):
        a = services.get_for_student(pk, request.user)
        sub = a.submissions.filter(student=request.user).first()
        if not sub:
            return Response({"detail": "Hali topshirilmagan"}, status=status.HTTP_404_NOT_FOUND)
        return Response(SubmissionSerializer(sub, context={"request": request}).data)


class SubmissionViewSet(viewsets.GenericViewSet):
    """Topshirishni ko'rish va baholash (FT-5.6)."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubmissionSerializer
    queryset = Submission.objects.none()

    def _get(self, pk) -> Submission:
        u = self.request.user
        sub = get_object_or_404(Submission.objects.select_related("assignment", "student", "attempt"), pk=pk)
        if sub.student_id == u.id:
            return sub
        if is_staff(u) and services.assignments_for_teacher(u).filter(pk=sub.assignment_id).exists():
            return sub
        raise Http404

    def retrieve(self, request, pk=None):
        return Response(SubmissionSerializer(self._get(pk), context={"request": request}).data)

    def _staff_sub(self, pk):
        sub = self._get(pk)
        u = self.request.user
        if not is_staff(u) or sub.student_id == u.id:
            raise PermissionDenied("Faqat o'qituvchi baholaydi")
        return sub

    @extend_schema(request=GradeSerializer, responses={200: SubmissionSerializer})
    @action(detail=True, methods=["post"])
    def grade(self, request, pk=None):
        sub = self._staff_sub(pk)
        if sub.status == Submission.Status.IN_PROGRESS and not sub.attempt_id:
            raise ValidationError("O'quvchi hali topshirmagan")
        s = GradeSerializer(data=request.data, context={"assignment": sub.assignment})
        s.is_valid(raise_exception=True)
        sub.grade = s.validated_data["grade"]
        sub.teacher_comment = s.validated_data["comment"]
        sub.status = Submission.Status.GRADED
        sub.graded_by = request.user
        sub.graded_at = timezone.now()
        sub.save()
        notifications.on_graded(sub)
        return Response(SubmissionSerializer(sub, context={"request": request}).data)

    @extend_schema(request=ReturnSerializer, responses={200: SubmissionSerializer})
    @action(detail=True, methods=["post"], url_path="return")
    def return_(self, request, pk=None):
        """Qayta topshirishga qaytarish: o'quvchi tuzatib yana topshiradi."""
        sub = self._staff_sub(pk)
        if sub.assignment.type != "lab":
            raise ValidationError("Test natijasini qaytarib bo'lmaydi — urinishlar sonini oshiring")
        s = ReturnSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        sub.status = Submission.Status.RETURNED
        sub.teacher_comment = s.validated_data["comment"]
        sub.grade = None
        sub.graded_by = request.user
        sub.graded_at = timezone.now()
        sub.save()
        notifications.on_returned(sub)
        return Response(SubmissionSerializer(sub, context={"request": request}).data)

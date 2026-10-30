from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.backends import find_user
from apps.accounts.models import Role, User
from apps.accounts.services import blacklist_all_tokens
from apps.accounts.utils import slug_login, temp_password
from apps.audit import services as audit
from apps.core.exceptions import Conflict
from apps.core.permissions import IsStudent, IsTeacher

from .districts import DISTRICTS
from .importers import check_limit, parse_students_file
from .models import Classroom, ClassroomMember, School
from .serializers import (
    AddTeacherSerializer,
    ClassroomSerializer,
    JoinCodeSerializer,
    JoinSerializer,
    MemberUserSerializer,
    MoveSerializer,
    SchoolSerializer,
    StudentImportSerializer,
)

STAFF_ROLES = (ClassroomMember.Role.TEACHER, ClassroomMember.Role.ASSISTANT)


class SchoolViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
                    viewsets.GenericViewSet):
    """FT-2.1: maktablarni qidirish (hamma uchun) va qo'shish (o'qituvchi)."""

    serializer_class = SchoolSerializer
    queryset = School.objects.all()

    def get_permissions(self):
        if self.action == "create":
            return [IsTeacher()]
        return [permissions.AllowAny()]

    @extend_schema(parameters=[OpenApiParameter("region", str), OpenApiParameter("district", str),
                               OpenApiParameter("q", str)])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("region"):
            qs = qs.filter(region=p["region"])
        if p.get("district"):
            qs = qs.filter(district__icontains=p["district"])
        if p.get("q"):
            qs = qs.filter(Q(name__icontains=p["q"]) | Q(number__iexact=p["q"]))
        return qs


def staff_classroom(user, pk) -> Classroom:
    """Foydalanuvchi o'qituvchisi bo'lgan sinf; aks holda 404 (boshqa sinf borligini oshkor qilmaymiz)."""
    qs = Classroom.objects.all()
    if not user.is_platform_admin:
        qs = qs.filter(memberships__user=user, memberships__role__in=STAFF_ROLES)
    return get_object_or_404(qs.distinct(), pk=pk)


def unique_username(first, last) -> str:
    base = slug_login(first, last)[:34]
    name, n = base, 1
    while User.objects.filter(username__iexact=name).exists():
        n += 1
        name = f"{base}{n}"
    return name


class ClassroomViewSet(viewsets.ModelViewSet):
    """FT-2.2 – FT-2.6. O'qituvchi o'z sinflarini, o'quvchi a'zo bo'lgan sinflarini ko'radi."""

    serializer_class = ClassroomSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Classroom.objects.none()  # OpenAPI uchun
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        u = self.request.user
        qs = Classroom.objects.select_related("school").prefetch_related("memberships__user").annotate(
            student_count=Count("memberships", filter=Q(memberships__role=ClassroomMember.Role.STUDENT))
        )
        if u.is_platform_admin:
            pass
        else:
            qs = qs.filter(memberships__user=u)
        p = self.request.query_params
        if p.get("archived") in ("1", "true"):
            qs = qs.filter(is_archived=True)
        elif p.get("archived") != "all":
            qs = qs.filter(is_archived=False)
        return qs.distinct().order_by("-academic_year", "grade", "name")

    def get_permissions(self):
        if self.action in ("create",):
            return [IsTeacher()]
        return super().get_permissions()

    def _require_staff(self, classroom):
        u = self.request.user
        if u.is_platform_admin:
            return
        if not classroom.memberships.filter(user=u, role__in=STAFF_ROLES).exists():
            raise PermissionDenied("Bu amal faqat sinf o'qituvchisi uchun")

    @transaction.atomic
    def perform_create(self, serializer):
        u = self.request.user
        classroom = serializer.save(school=u.school, created_by=u)
        ClassroomMember.objects.create(classroom=classroom, user=u, role=ClassroomMember.Role.TEACHER)
        classroom.refresh_join_code(days=7)

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        self.perform_create(s)
        obj = self.get_queryset().get(pk=s.instance.pk)
        return Response(self.get_serializer(obj).data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        self._require_staff(serializer.instance)
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """O'chirilmaydi — arxivga o'tkaziladi (FT-2.6)."""
        classroom = self.get_object()
        self._require_staff(classroom)
        classroom.is_archived = True
        classroom.join_code = None
        classroom.save(update_fields=["is_archived", "join_code", "updated_at"])
        audit.log(request, "classroom.archive", classroom)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=JoinCodeSerializer, responses={200: ClassroomSerializer})
    @action(detail=True, methods=["post"], url_path="join-code")
    def join_code(self, request, pk=None):
        """FT-2.3: kodni yangilash (muddat bilan yoki muddatsiz)."""
        classroom = staff_classroom(request.user, pk)
        s = JoinCodeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        classroom.refresh_join_code(days=s.validated_data.get("expires_days"))
        return Response(self.get_serializer(self.get_queryset().get(pk=classroom.pk)).data)

    @extend_schema(responses={204: None})
    @join_code.mapping.delete
    def disable_join_code(self, request, pk=None):
        classroom = staff_classroom(request.user, pk)
        classroom.join_code = None
        classroom.save(update_fields=["join_code", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(responses={200: MemberUserSerializer(many=True)})
    @action(detail=True, methods=["get"])
    def students(self, request, pk=None):
        """FT-2.4: sinf o'quvchilari ro'yxati."""
        classroom = staff_classroom(request.user, pk)
        users = User.objects.filter(
            memberships__classroom=classroom, memberships__role=ClassroomMember.Role.STUDENT
        ).order_by("last_name", "first_name")
        return Response(MemberUserSerializer(users, many=True).data)

    @extend_schema(request=StudentImportSerializer, responses={201: dict})
    @action(detail=True, methods=["post"], url_path="students/import",
            parser_classes=[JSONParser, MultiPartParser, FormParser])
    @transaction.atomic
    def students_import(self, request, pk=None):
        """FT-1.2: ro'yxatdan (yoki CSV/XLSX fayldan) o'quvchi hisoblarini yaratish.
        Vaqtinchalik parollar faqat shu javobda bir marta ko'rsatiladi."""
        classroom = staff_classroom(request.user, pk)
        s = StudentImportSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        rows = s.validated_data.get("students") or parse_students_file(s.validated_data["file"])
        check_limit(rows)
        created = []
        for r in rows:
            pwd = temp_password()
            user = User(username=unique_username(r["first_name"], r["last_name"]), first_name=r["first_name"],
                        last_name=r["last_name"], role=Role.STUDENT, school=classroom.school,
                        is_verified=True, must_change_password=True)
            user.set_password(pwd)
            user.save()
            ClassroomMember.objects.create(classroom=classroom, user=user)
            created.append({"id": str(user.id), "last_name": user.last_name, "first_name": user.first_name,
                            "username": user.username, "password": pwd})
        return Response({"classroom": classroom.name, "created": created}, status=status.HTTP_201_CREATED)

    def _student(self, classroom, uid) -> User:
        return get_object_or_404(User, pk=uid, memberships__classroom=classroom,
                                 memberships__role=ClassroomMember.Role.STUDENT)

    @extend_schema(request=None, responses={200: dict})
    @action(detail=True, methods=["post"], url_path=r"students/(?P<uid>[0-9a-f-]{36})/reset-password")
    def reset_password(self, request, pk=None, uid=None):
        """FT-1.5: o'quvchi parolini o'qituvchi tiklaydi."""
        classroom = staff_classroom(request.user, pk)
        student = self._student(classroom, uid)
        pwd = temp_password()
        student.set_password(pwd)
        student.must_change_password = True
        student.save(update_fields=["password", "must_change_password"])
        blacklist_all_tokens(student)
        audit.log(request, "student.password_reset_by_teacher", student, after={"classroom": classroom.pk})
        return Response({"username": student.username, "password": pwd})

    @extend_schema(request=MoveSerializer, responses={200: dict})
    @action(detail=True, methods=["post"], url_path=r"students/(?P<uid>[0-9a-f-]{36})/move")
    @transaction.atomic
    def move_student(self, request, pk=None, uid=None):
        """FT-2.4: boshqa sinfga ko'chirish (ikkala sinf ham shu o'qituvchiniki bo'lishi kerak)."""
        classroom = staff_classroom(request.user, pk)
        student = self._student(classroom, uid)
        s = MoveSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        target = staff_classroom(request.user, s.validated_data["classroom_id"])
        if target.pk == classroom.pk:
            raise ValidationError("O'quvchi allaqachon shu sinfda")
        ClassroomMember.objects.filter(classroom=classroom, user=student).delete()
        ClassroomMember.objects.get_or_create(classroom=target, user=student)
        return Response({"detail": f"O'quvchi {target.name} sinfiga ko'chirildi"})

    @extend_schema(responses={204: None})
    @action(detail=True, methods=["delete"], url_path=r"students/(?P<uid>[0-9a-f-]{36})")
    def remove_student(self, request, pk=None, uid=None):
        classroom = staff_classroom(request.user, pk)
        student = self._student(classroom, uid)
        ClassroomMember.objects.filter(classroom=classroom, user=student).delete()
        audit.log(request, "classroom.remove_student", student, after={"classroom": classroom.pk})
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=AddTeacherSerializer, responses={201: dict})
    @action(detail=True, methods=["post"])
    def teachers(self, request, pk=None):
        """FT-2.5: sinfga ikkinchi (yordamchi) o'qituvchi qo'shish."""
        classroom = staff_classroom(request.user, pk)
        s = AddTeacherSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        teacher = find_user(s.validated_data["login"])
        if not teacher or not teacher.is_teacher:
            raise ValidationError({"login": ["Bunday o'qituvchi topilmadi"]})
        m, created = ClassroomMember.objects.get_or_create(
            classroom=classroom, user=teacher, defaults={"role": s.validated_data["role"]}
        )
        if not created:
            raise Conflict("Bu o'qituvchi allaqachon sinfda")
        return Response({"id": str(teacher.id), "role": m.role}, status=status.HTTP_201_CREATED)

    @extend_schema(responses={204: None})
    @action(detail=True, methods=["delete"], url_path=r"teachers/(?P<uid>[0-9a-f-]{36})")
    def remove_teacher(self, request, pk=None, uid=None):
        classroom = staff_classroom(request.user, pk)
        m = get_object_or_404(ClassroomMember, classroom=classroom, user_id=uid, role__in=STAFF_ROLES)
        if classroom.memberships.filter(role__in=STAFF_ROLES).count() == 1:
            raise ValidationError("Sinfda kamida bitta o'qituvchi qolishi kerak")
        m.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JoinClassroomView(APIView):
    """Ro'yxatdan o'tgan o'quvchi yangi sinfga kod bilan qo'shiladi."""

    permission_classes = [IsStudent]

    @extend_schema(request=JoinSerializer, responses={200: dict})
    def post(self, request):
        s = JoinSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        classroom = Classroom.objects.filter(join_code__iexact=s.validated_data["code"].strip()).first()
        if not classroom or not classroom.join_code_active:
            raise ValidationError({"code": ["Sinf kodi noto'g'ri yoki muddati o'tgan"]})
        _, created = ClassroomMember.objects.get_or_create(classroom=classroom, user=request.user)
        if not created:
            raise Conflict("Siz allaqachon shu sinfdasiz")
        from apps.notifications.services import on_student_joined

        on_student_joined(classroom, request.user)
        if not request.user.school_id and classroom.school_id:
            request.user.school = classroom.school
            request.user.save(update_fields=["school"])
        return Response({"id": classroom.pk, "name": classroom.name})


class DistrictListView(APIView):
    """Viloyat tumanlari va shaharlari (ro'yxatdan o'tishda tanlash uchun). ?region= bo'lmasa — hammasi."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(parameters=[OpenApiParameter("region", str)], responses={200: dict})
    def get(self, request):
        region = request.query_params.get("region")
        if region:
            if region not in DISTRICTS:
                raise ValidationError({"region": ["Noma'lum viloyat"]})
            return Response({region: DISTRICTS[region]})
        return Response(DISTRICTS)

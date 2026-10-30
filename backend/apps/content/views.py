import json

from django.conf import settings
from django.db.models import F, Q
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils.translation import get_language
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit import services as audit
from apps.core.permissions import IsTeacher
from apps.simulations.models import Simulation

from .models import LessonPlan, Translation
from .validators import validate_docx, validate_pdf


class LessonPlanSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    simulation = serializers.SlugRelatedField(slug_field="slug", queryset=Simulation.objects.all(), required=False,
                                              allow_null=True)
    simulation_page = serializers.CharField(source="simulation.page_path", read_only=True, default=None)
    has_pdf = serializers.BooleanField(read_only=True)
    has_docx = serializers.BooleanField(read_only=True)
    author_name = serializers.SerializerMethodField()
    pdf = serializers.FileField(write_only=True, required=False)
    docx = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = LessonPlan
        fields = ["id", "title", "title_uz", "title_ru", "grade", "lesson_type", "icon", "simulation",
                  "simulation_page", "has_pdf", "has_docx", "pdf", "docx", "static_pdf", "status", "moderator_comment",
                  "downloads", "author_name", "created_at"]
        read_only_fields = ["static_pdf", "status", "moderator_comment", "downloads", "created_at"]
        extra_kwargs = {"title_uz": {"write_only": True}, "title_ru": {"write_only": True, "required": False}}

    def get_title(self, obj) -> str:
        ru = (get_language() or "uz").startswith("ru")
        return obj.title_ru if ru and obj.title_ru else obj.title_uz

    def get_author_name(self, obj) -> str | None:
        return f"{obj.author.last_name} {obj.author.first_name}".strip() if obj.author else None

    def validate_pdf(self, f):
        return validate_pdf(f)

    def validate_docx(self, f):
        return validate_docx(f)

    def validate(self, data):
        if not self.instance and not data.get("pdf"):
            raise ValidationError({"pdf": ["PDF fayl majburiy"]})
        return data


class LessonPlanViewSet(viewsets.ModelViewSet):
    """FT-7.1 – FT-7.4. Ro'yxat hamma uchun (nashr etilganlar); yuklash — o'qituvchi (moderatsiyaga)."""

    serializer_class = LessonPlanSerializer
    parser_classes = [MultiPartParser, FormParser]
    http_method_names = ["get", "post", "delete"]
    queryset = LessonPlan.objects.none()

    def get_permissions(self):
        if self.action in ("list", "retrieve", "download"):
            return [permissions.AllowAny()]
        return [IsTeacher()]

    def get_queryset(self):
        u = self.request.user
        qs = LessonPlan.objects.select_related("simulation", "author")
        if getattr(u, "is_platform_admin", False):
            pass
        elif u.is_authenticated:
            qs = qs.filter(Q(status=LessonPlan.Status.PUBLISHED) | Q(author=u))
        else:
            qs = qs.filter(status=LessonPlan.Status.PUBLISHED)
        p = self.request.query_params
        if p.get("grade"):
            qs = qs.filter(grade=p["grade"])
        if p.get("has_model") in ("1", "true"):
            qs = qs.filter(simulation__isnull=False)
        if p.get("mine") in ("1", "true") and u.is_authenticated:
            qs = qs.filter(author=u)
        if p.get("status") and getattr(u, "is_platform_admin", False):
            qs = qs.filter(status=p["status"])
        if p.get("q"):
            qs = qs.filter(Q(title_uz__icontains=p["q"]) | Q(title_ru__icontains=p["q"]) |
                           Q(lesson_type__icontains=p["q"]))
        return qs

    @extend_schema(parameters=[OpenApiParameter("grade", int), OpenApiParameter("q", str),
                               OpenApiParameter("has_model", bool), OpenApiParameter("mine", bool)])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        u = self.request.user
        st = LessonPlan.Status.PUBLISHED if u.is_platform_admin else LessonPlan.Status.REVIEW
        plan = serializer.save(author=u, status=st)
        audit.log(self.request, "lesson_plan.upload", plan, after={"title": plan.title_uz, "status": st})

    def perform_destroy(self, instance):
        u = self.request.user
        if not (u.is_platform_admin or (instance.author_id == u.id and instance.status != LessonPlan.Status.PUBLISHED)):
            raise PermissionDenied("Nashr etilgan ishlanmani faqat administrator o'chiradi")
        audit.log(self.request, "lesson_plan.delete", instance, before={"title": instance.title_uz})
        for f in (instance.pdf, instance.docx):
            if f:
                f.delete(save=False)
        instance.delete()

    @extend_schema(parameters=[OpenApiParameter("type", str, enum=["pdf", "docx"])], responses={302: None})
    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """FT-7.4: yuklab olishlar hisoblanadi, so'ng faylga yo'naltiriladi."""
        plan = get_object_or_404(self.get_queryset(), pk=pk)
        kind = request.query_params.get("type", "pdf")
        if kind not in ("pdf", "docx"):
            raise ValidationError({"type": ["pdf yoki docx"]})
        f, static = (plan.pdf, plan.static_pdf) if kind == "pdf" else (plan.docx, plan.static_docx)
        if not f and not static:
            return Response({"error": {"code": "not_found", "message": "Bu formatdagi fayl yo'q"}},
                            status=status.HTTP_404_NOT_FOUND)
        LessonPlan.objects.filter(pk=plan.pk).update(downloads=F("downloads") + 1)
        # Statik fayl saytning o'zida turadi (SITE_URL) — backend boshqa domenda bo'lsa ham to'g'ri manzil
        return HttpResponseRedirect(f.url if f else settings.SITE_URL.rstrip("/") + "/" + static.lstrip("/"))

    @extend_schema(request={"application/json": {"type": "object", "properties": {
        "action": {"type": "string", "enum": ["publish", "reject"]}, "comment": {"type": "string"}}}},
        responses={200: LessonPlanSerializer})
    @action(detail=True, methods=["post"], parser_classes=[JSONParser, FormParser, MultiPartParser])
    def moderate(self, request, pk=None):
        """FT-7.2: administrator nashr etadi yoki izoh bilan rad etadi."""
        if not request.user.is_platform_admin:
            raise PermissionDenied("Faqat administrator")
        plan = get_object_or_404(LessonPlan, pk=pk)
        act = request.data.get("action")
        if act not in ("publish", "reject"):
            raise ValidationError({"action": ["publish yoki reject"]})
        before = plan.status
        plan.status = LessonPlan.Status.PUBLISHED if act == "publish" else LessonPlan.Status.REJECTED
        plan.moderator_comment = request.data.get("comment", "")
        plan.save(update_fields=["status", "moderator_comment", "updated_at"])
        audit.log(request, f"lesson_plan.{act}", plan, before={"status": before}, after={"status": plan.status})
        return Response(LessonPlanSerializer(plan, context={"request": request}).data)


def build_ru_js() -> str:
    data = dict(Translation.objects.exclude(ru="").values_list("key", "ru"))
    return ("/* Rus tili lug'ati — bazadan yaratilgan (GET /api/v1/i18n/ru.js). i18n.js ishlatadi. */\n"
            "window.FIZIKA_RU = " + json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            .replace('","', '",\n"') + ";\n")


class RuDictionaryView(APIView):
    """FT-7.6: tarjimalar bazadan JS ko'rinishida (i18n-ru.js formatida)."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @extend_schema(responses={(200, "application/javascript"): str})
    def get(self, request):
        resp = HttpResponse(build_ru_js(), content_type="application/javascript; charset=utf-8")
        resp["Cache-Control"] = "public, max-age=600"
        return resp

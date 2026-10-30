from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit import services as audit
from apps.core.permissions import IsTeacher
from apps.simulations.serializers import lang

from . import services
from .importers import import_questions_xlsx
from .models import Attempt, AttemptItem, Problem, Question, Status, Topic
from .serializers import (
    AnswerSerializer,
    AttemptListSerializer,
    AttemptSerializer,
    PracticeQuestionSerializer,
    ProblemSerializer,
    QuestionSerializer,
    ResultSerializer,
    StartAttemptSerializer,
    TopicSerializer,
)
from .validators import problem_is_usable, question_is_usable


class TopicListView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: TopicSerializer(many=True)})
    @method_decorator(cache_page(300))
    @method_decorator(vary_on_headers("Accept-Language"))
    def get(self, request):
        qs = Topic.objects.annotate(
            n_questions=Count("questions", filter=Q(questions__status=Status.APPROVED), distinct=True),
            n_problems=Count("problems", filter=Q(problems__status=Status.APPROVED), distinct=True),
        )
        return Response(TopicSerializer(qs, many=True).data)


class PracticeView(APIView):
    """FT-6.7: mashq rejimi — hamma uchun, javoblar va izohlar bilan (nazorat emas)."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(parameters=[OpenApiParameter("topics", str, description="vergul bilan: Kepler,Linza"),
                               OpenApiParameter("count", int), OpenApiParameter("seed", int)],
                   responses={200: PracticeQuestionSerializer(many=True)})
    def get(self, request):
        p = request.query_params
        topics = [t for t in (p.get("topics") or "").split(",") if t] or list(
            Topic.objects.values_list("key", flat=True))
        try:
            count = min(int(p.get("count", 20)), 200)
        except ValueError as e:
            raise ValidationError({"count": ["Son bo'lishi kerak"]}) from e
        try:
            questions, _, rng = services.select_items(topics, count, 0, seed=p.get("seed"))
        except ValueError as e:
            raise ValidationError(str(e)) from e
        lg = lang()
        out = []
        for q in questions:
            order = list(range(4))
            rng.shuffle(order)
            texts = q.option_texts(lg)
            out.append({"id": q.id, "topic": q.topic.key, "tag": f"{q.topic.title_uz} · {q.get_level_display()}",
                        "text": q.text(lg), "options": [texts[i] for i in order],
                        "correct": order.index(q.correct_index), "explanation": q.explanation(lg)})
        return Response(out)


class BankView(APIView):
    """
    Mashq sahifasi (`testlar/testlar_online.html`) uchun butun tasdiqlangan bank — sahifadagi o'rnatilgan bank
    bilan bir xil formatda. Admin panelda tasdiqlangan/tahrirlangan/arxivlangan savollar saytda shu orqali
    ko'rinadi. Matnlar o'zbekcha (ruscha rejimda sahifa ularni `i18n-ru.js` lug'ati orqali tarjima qiladi).
    Parametrlangan masalalar har so'rovda yangi sonlar bilan beriladi.
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: dict})
    def get(self, request):
        import random

        topics = list(Topic.objects.order_by("order", "id"))
        questions = (Question.objects.filter(status=Status.APPROVED).select_related("topic")
                     .order_by("topic__order", "level", "id"))
        problems = Problem.objects.filter(status=Status.APPROVED).select_related("topic").order_by("topic__order", "id")
        rng = random.SystemRandom()
        out_p = []
        for p in problems:
            if not problem_is_usable(p):
                continue
            values, ans = services.generate_params(p, rng)
            vals = {**(values or {}), "answer": ans if ans is not None else p.answer}
            out_p.append({"id": p.id, "tag": f"{p.topic.title_uz} · Hisoblash", "q": p.text("uz", values),
                          "ans": ans if ans is not None else p.answer, "unit": p.unit, "tol": p.tolerance_pct,
                          "sol": p.solution("uz", vals)})
        return Response({
            "topics": [t.title_uz for t in topics],
            "questions": [{"id": q.id, "tag": f"{q.topic.title_uz} · {q.get_level_display()}", "q": q.text_uz,
                           "o": q.option_texts("uz"), "correct": q.correct_index, "ex": q.explanation_uz}
                          for q in questions if question_is_usable(q)],
            "problems": out_p,
        })


class AttemptViewSet(viewsets.GenericViewSet):
    """FT-6.4 – FT-6.6: nazorat testi. To'g'ri javoblar mijozga yuborilmaydi."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AttemptSerializer
    queryset = Attempt.objects.none()

    def get_queryset(self):
        return Attempt.objects.filter(user=self.request.user)

    def _get(self, pk) -> Attempt:
        attempt = get_object_or_404(self.get_queryset(), pk=pk)
        # Vaqt tugagan bo'lsa — avtomatik yakunlanadi
        if not attempt.is_finished and services.is_expired(attempt):
            self._finish(attempt)
        return attempt

    def _finish(self, attempt):
        services.finish_attempt(attempt)
        if attempt.assignment_id:
            from apps.assignments.services import on_attempt_finished

            on_attempt_finished(attempt)

    @extend_schema(responses={200: AttemptListSerializer(many=True)})
    def list(self, request):
        qs = self.get_queryset().filter(finished_at__isnull=False)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(AttemptListSerializer(page, many=True).data)

    @extend_schema(request=StartAttemptSerializer, responses={201: AttemptSerializer})
    def create(self, request):
        s = StartAttemptSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        if d.get("assignment_id"):
            from apps.assignments.services import start_test_for

            attempt = start_test_for(d["assignment_id"], request.user)
        else:
            try:
                attempt = services.create_attempt(request.user, topics=d["topics"], count=d["count"],
                                                  problems=d["problems"], time_limit_min=d.get("time_limit_min"))
            except ValueError as e:
                raise ValidationError(str(e)) from e
        return Response(AttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        return Response(AttemptSerializer(self._get(pk)).data)

    @extend_schema(request=AnswerSerializer, responses={200: dict})
    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        attempt = self._get(pk)
        s = AnswerSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        item = get_object_or_404(AttemptItem.objects.select_related("question", "problem"),
                                 attempt=attempt, order=s.validated_data["item_id"])
        try:
            ok = services.answer_item(attempt, item, s.validated_data["answer"])
        except services.AnswerError as e:
            raise ValidationError({"answer": [str(e)]}) from e
        show = attempt.show_answers == Attempt.ShowAnswers.IMMEDIATELY
        return Response({"accepted": True, "is_correct": ok if show else None})

    @extend_schema(request=None, responses={200: ResultSerializer})
    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        attempt = self._get(pk)
        if not attempt.is_finished:
            self._finish(attempt)
        return Response(ResultSerializer(attempt).data)

    @extend_schema(responses={200: ResultSerializer})
    @action(detail=True, methods=["get"])
    def result(self, request, pk=None):
        attempt = self._get(pk)
        if not attempt.is_finished:
            raise ValidationError("Test hali yakunlanmagan")
        return Response(ResultSerializer(attempt).data)


class BankPermission(permissions.BasePermission):
    """O'qituvchi: tasdiqlanganlarni o'qiydi, o'zinikini tahrirlaydi. Admin: hammasi."""

    def has_permission(self, request, view):
        return IsTeacher().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        u = request.user
        if request.method in permissions.SAFE_METHODS or u.is_platform_admin:
            return True
        return obj.author_id == u.id and obj.status != Status.APPROVED


class _BankViewSet(viewsets.ModelViewSet):
    permission_classes = [BankPermission]

    def get_queryset(self):
        u = self.request.user
        qs = self.model.objects.select_related("topic", "author")
        if not u.is_platform_admin:
            qs = qs.filter(Q(status=Status.APPROVED) | Q(author=u))
        p = self.request.query_params
        if p.get("topic"):
            qs = qs.filter(topic__key=p["topic"])
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("mine") in ("1", "true"):
            qs = qs.filter(author=u)
        if p.get("q"):
            qs = qs.filter(Q(text_uz__icontains=p["q"]) | Q(text_ru__icontains=p["q"]))
        return qs

    def perform_create(self, serializer):
        u = self.request.user
        serializer.save(author=u, status=serializer.validated_data.get("status", Status.DRAFT)
                        if u.is_platform_admin else Status.DRAFT)

    def perform_destroy(self, instance):
        audit.log(self.request, f"{self.model._meta.model_name}.delete", instance, before={"text": instance.text_uz[:200]})
        # Urinishda ishlatilgan savol o'chirilmaydi — arxivlanadi
        if AttemptItem.objects.filter(**{self.model._meta.model_name: instance}).exists():
            instance.status = Status.ARCHIVED
            instance.save(update_fields=["status", "updated_at"])
        else:
            instance.delete()


class QuestionViewSet(_BankViewSet):
    model = Question
    serializer_class = QuestionSerializer
    queryset = Question.objects.none()

    @extend_schema(request={"multipart/form-data": {"type": "object", "properties": {
        "file": {"type": "string", "format": "binary"}}}}, responses={201: dict})
    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser], url_path="import")
    def import_xlsx(self, request):
        """FT-6.3: Excel shablondan savollar (ustunlar: Mavzu, Daraja, Savol, A, B, C, D, To'g'ri, Izoh)."""
        f = request.FILES.get("file")
        if not f:
            raise ValidationError({"file": ["Fayl yuboring (.xlsx)"]})
        created, errors = import_questions_xlsx(f, request.user)
        return Response({"created": created, "errors": errors},
                        status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)


class ProblemViewSet(_BankViewSet):
    model = Problem
    serializer_class = ProblemSerializer
    queryset = Problem.objects.none()

    @extend_schema(request=ProblemSerializer, responses={200: dict})
    @action(detail=False, methods=["post"])
    def preview(self, request):
        """Saqlashdan oldin tekshirish: o'quvchilar ko'radigan 3 ta namuna (sonlar, javob, yechim)."""
        import random

        ser = ProblemSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        p = Problem(**{k: v for k, v in ser.validated_data.items() if k != "status"})
        rng = random.SystemRandom()
        samples = []
        for _ in range(3 if p.params else 1):
            values, ans = services.generate_params(p, rng)
            ans = ans if ans is not None else p.answer
            samples.append({"text": p.text("uz", values), "answer": ans, "unit": p.unit,
                            "solution": p.solution("uz", {**(values or {}), "answer": ans})})
        return Response({"samples": samples})

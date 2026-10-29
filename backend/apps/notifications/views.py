from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "body", "url", "is_read", "created_at"]


class NotificationViewSet(viewsets.GenericViewSet):
    """FT-9.1: sayt ichidagi bildirishnomalar (qo'ng'iroqcha)."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer
    queryset = Notification.objects.none()

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @extend_schema(parameters=[OpenApiParameter("unread", bool)])
    def list(self, request):
        qs = self.get_queryset()
        if request.query_params.get("unread") in ("1", "true"):
            qs = qs.filter(is_read=False)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(NotificationSerializer(page, many=True).data)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return Response({"count": self.get_queryset().filter(is_read=False).count()})

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        n = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": n})

    @extend_schema(request=None, responses={200: NotificationSerializer})
    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        n = get_object_or_404(self.get_queryset(), pk=pk)
        n.is_read = True
        n.save(update_fields=["is_read"])
        return Response(NotificationSerializer(n).data)

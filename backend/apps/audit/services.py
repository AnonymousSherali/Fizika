"""audit.log(request, "grade.set", obj, before={...}, after={...})"""
import logging

from .models import AuditLog

logger = logging.getLogger(__name__)


def _ip(request):
    if request is None:
        return None
    fwd = request.META.get("HTTP_X_FORWARDED_FOR")
    return fwd.split(",")[0].strip() if fwd else request.META.get("REMOTE_ADDR")


def log(request, action, obj=None, before=None, after=None, actor=None):
    """Audit yozuvi. Hech qachon asosiy amalni buzmaydi — xato bo'lsa faqat logga yoziladi."""
    try:
        user = actor if actor is not None else getattr(request, "user", None)
        if user is not None and not getattr(user, "is_authenticated", False):
            user = None
        AuditLog.objects.create(
            actor=user, action=action,
            object_type=obj._meta.label_lower if obj is not None else "",
            object_id=str(obj.pk) if obj is not None else "",
            before=before, after=after, ip=_ip(request),
            user_agent=(request.META.get("HTTP_USER_AGENT", "")[:300] if request is not None else ""),
        )
    except Exception:  # noqa: BLE001
        logger.exception("Audit yozuvi saqlanmadi: %s", action)

"""
Yagona xato formati (TZ 8.1):
{"error": {"code": "...", "message": "...", "fields": {...}}}
"""
from django.utils.translation import gettext as _
from rest_framework import exceptions, status
from rest_framework.views import exception_handler

DEFAULT_MESSAGES = {
    status.HTTP_400_BAD_REQUEST: "Ma'lumotlar noto'g'ri",
    status.HTTP_401_UNAUTHORIZED: "Tizimga kirilmagan yoki token eskirgan",
    status.HTTP_403_FORBIDDEN: "Bu amal uchun huquq yo'q",
    status.HTTP_404_NOT_FOUND: "Topilmadi",
    status.HTTP_405_METHOD_NOT_ALLOWED: "Bu metod ruxsat etilmagan",
    status.HTTP_409_CONFLICT: "Ziddiyat",
    status.HTTP_429_TOO_MANY_REQUESTS: "So'rovlar juda ko'p. Birozdan keyin urinib ko'ring",
}


class LoginFailed(exceptions.APIException):
    """Kirish xatosi — har doim 401 (DRF autentifikatsiyasiz view'da AuthenticationFailed ni 403 qilardi)."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Login yoki parol noto'g'ri"
    default_code = "invalid_credentials"


class Conflict(exceptions.APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Ziddiyat"
    default_code = "conflict"


def _code(exc, response):
    if isinstance(exc, exceptions.ValidationError):
        return "validation_error"
    codes = exc.get_codes() if hasattr(exc, "get_codes") else None
    if isinstance(codes, str):
        return codes
    return {
        401: "not_authenticated",
        403: "permission_denied",
        404: "not_found",
        429: "throttled",
    }.get(response.status_code, "error")


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None
    data = response.data
    fields = None
    if isinstance(exc, exceptions.ValidationError):
        if isinstance(data, dict):
            non_field = data.pop("non_field_errors", None)
            fields = data or None
            message = str(non_field[0]) if non_field else _(DEFAULT_MESSAGES[400])
        else:
            message = str(data[0]) if isinstance(data, list) and data else _(DEFAULT_MESSAGES[400])
    else:
        detail = data.get("detail") if isinstance(data, dict) else None
        message = str(detail) if detail else _(DEFAULT_MESSAGES.get(response.status_code, "Xatolik"))
    body = {"code": _code(exc, response), "message": message}
    if fields:
        body["fields"] = fields
    response.data = {"error": body}
    return response

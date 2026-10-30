"""Mijoz IP manzili — bitta joyda (login tarixi, audit, kirishni bloklash)."""
from django.conf import settings


def client_ip(request) -> str | None:
    """
    X-Forwarded-For ni mijoz o'zi yozishi mumkin — shuning uchun faqat ishonchli proksilar (nginx) qo'shgan
    oxirgi NUM_PROXIES ta qiymatga ishoniladi. NUM_PROXIES=0 (lokal) bo'lsa — REMOTE_ADDR.
    """
    if request is None:
        return None
    proxies = settings.REST_FRAMEWORK.get("NUM_PROXIES") or 0
    fwd = request.META.get("HTTP_X_FORWARDED_FOR")
    if proxies and fwd:
        parts = [p.strip() for p in fwd.split(",") if p.strip()]
        if parts:
            return parts[-min(proxies, len(parts))]
    return request.META.get("REMOTE_ADDR")

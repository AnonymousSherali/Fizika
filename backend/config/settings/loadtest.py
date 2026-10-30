"""Faqat yuklama testi uchun: production sozlamalari, lekin IP bo'yicha cheklovlarsiz
(barcha virtual foydalanuvchilar bitta kompyuterdan keladi) va HTTPS yo'naltirishsiz."""
from .production import *  # noqa: F403
from .production import REST_FRAMEWORK

SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = False
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {k: "100000/min" for k in REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]},
}

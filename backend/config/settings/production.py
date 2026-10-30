from .base import *  # noqa: F403
from .base import REST_FRAMEWORK, env

DEBUG = False
ADMIN_2FA = env.bool("ADMIN_2FA", default=True)   # production'da standart — yoqilgan

# TZ 11.3: faqat HTTPS, HSTS
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# Backend nginx ortida: mijoz IP si X-Forwarded-For ning oxirgi (nginx qo'shgan) qiymati
REST_FRAMEWORK["NUM_PROXIES"] = env.int("NUM_PROXIES", default=1)
# Maxfiy fayllarni nginx beradi (X-Accel-Redirect, deploy/snippets/fizika-common.conf)
MEDIA_X_ACCEL = env.bool("MEDIA_X_ACCEL", default=True)
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

if env("DJANGO_SECRET_KEY", default="").startswith("dev-") or not env("DJANGO_SECRET_KEY", default=""):
    raise RuntimeError("Production uchun DJANGO_SECRET_KEY ni .env da o'rnating")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {"format": '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}'}
    },
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

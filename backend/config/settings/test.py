from .base import *  # noqa: F403
from .base import REST_FRAMEWORK

SECRET_KEY = "test-secret-key-for-pytest-only-0123456789abcdef"
DEBUG = False
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # testlar tez ishlasin
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CELERY_TASK_ALWAYS_EAGER = True
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
SMS_PROVIDER = "console"
# Throttling alohida testlarda tekshiriladi; qolganlarida xalaqit bermasin
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {**REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
                               "anon": "10000/min", "user": "10000/min", "login": "10000/min",
                               "register": "10000/min", "code": "10000/min"},
}
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
# Testlarda collectstatic yo'q — whitenoise kerak emas
from .base import MIDDLEWARE  # noqa: E402

MIDDLEWARE = [m for m in MIDDLEWARE if "whitenoise" not in m]

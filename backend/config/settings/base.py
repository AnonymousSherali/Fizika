"""
Umumiy sozlamalar. Muhitga xos qiymatlar .env / muhit o'zgaruvchilaridan olinadi
(namuna: .env.example). Maxfiy kalitlar repozitoriyga yozilmaydi.
"""
from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env", overwrite=False)

# Mavjud statik sayt (modellar, testlar) — import skriptlari shu yerdan o'qiydi
FRONTEND_DIR = env.path("FRONTEND_DIR", default=BASE_DIR.parent)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-only-insecure-key-change-me")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Uchinchi tomon
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "corsheaders",
    "django_otp",
    "django_otp.plugins.otp_totp",
    # Loyiha ilovalari
    "apps.core",
    "apps.accounts",
    "apps.schools",
    "apps.simulations",
    "apps.labs",
    "apps.quizzes",
    "apps.assignments",
    "apps.analytics",
    "apps.notifications",
    "apps.content",
    "apps.audit",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # admin/swagger statik fayllari (gunicorn ortida)
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# PostgreSQL (TZ 4.3). DATABASE_URL berilmasa — lokal SQLite (tez boshlash uchun)
DATABASES = {"default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")}
# Ulanishni qayta ishlatish: har so'rovda yangi ulanish ochish yuklamada sezilarli sekinlashtirardi
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = ["apps.accounts.backends.LoginBackend"]
# TZ 11.3: Argon2 (OWASP tavsiyasi) — PBKDF2'dan kam CPU, xavfsizroq. Eski xeshlar kirishda avtomatik yangilanadi
PASSWORD_HASHERS = [
    "apps.accounts.hashers.FizikaArgon2Hasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Til: o'zbek (asosiy) va rus. Accept-Language sarlavhasi bo'yicha tanlanadi
LANGUAGE_CODE = "uz"
LANGUAGES = [("uz", "O'zbekcha"), ("ru", "Русский")]
LOCALE_PATHS = [BASE_DIR / "locale"]
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
MEDIA_URL = "/media/"
MEDIA_ROOT = env.path("MEDIA_ROOT", default=BASE_DIR / "media")

REDIS_URL = env("REDIS_URL", default="")
CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": REDIS_URL}
    if REDIS_URL
    else {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
}

# ---------- REST API ----------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticatedOrReadOnly"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.Pagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    # TZ 11.3, 4-band
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "120/min",
        "login": "10/min",
        "register": "5/hour",
        "code": "5/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=30)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Fizika 10–11 API",
    "DESCRIPTION": "Interaktiv fizika platformasi backendi (TZ: hujjatlar/backend_TZ.md)",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "SubmissionStatusEnum": "apps.assignments.models.Submission.Status",
        "BankStatusEnum": "apps.quizzes.models.Status",
    },
}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# ---------- Tasdiqlash kodlari (SMS / email) ----------
# console — kod logga yoziladi (ishlab chiqish); eskiz — Eskiz.uz SMS shlyuzi
SMS_PROVIDER = env("SMS_PROVIDER", default="console")
SMS_API_TOKEN = env("SMS_API_TOKEN", default="")
VERIFICATION_CODE_TTL_MINUTES = 10
VERIFICATION_CODE_MAX_ATTEMPTS = 5

EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Fizika 10–11 <noreply@localhost>")

# ---------- Hisob xavfsizligi (TZ FT-1.8) ----------
LOGIN_MAX_FAILURES = 10
LOGIN_LOCK_MINUTES = 15
ACCOUNT_DELETION_GRACE_DAYS = 30

# ---------- Statistika va bildirishnomalar (3-bosqich) ----------
ANALYTICS_CACHE_SECONDS = 600            # FT-8.5: 10 daqiqa
AUDIT_RETENTION_DAYS = 365            # FT-11.3
LESSON_PDF_MAX_MB = 15                # FT-7.3
LESSON_DOCX_MAX_MB = 10
SITE_URL = env("SITE_URL", default="http://localhost:8000/")   # emaildagi havolalar uchun

# ---------- Admin uchun ikki bosqichli kirish (TZ FT-10.4) ----------
# true bo'lsa admin panelga kirishda TOTP kodi (Google Authenticator va h.k.) so'raladi.
# Qurilma ulash: python manage.py admin_2fa_setup <login>
ADMIN_2FA = env.bool("ADMIN_2FA", default=False)
OTP_TOTP_ISSUER = "Fizika 10–11"

# ---------- Sentry (TZ NF-10): DSN berilsa xatolar yuboriladi ----------
SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(dsn=SENTRY_DSN, send_default_pii=False, traces_sample_rate=0.05,
                    environment=env("SENTRY_ENVIRONMENT", default="production"))

# ---------- Celery ----------
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=False)
CELERY_TIMEZONE = TIME_ZONE

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

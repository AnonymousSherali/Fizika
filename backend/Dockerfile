FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
# Modellar katalogini import qilish uchun statik sayt fayllari /frontend ga ulanadi (docker-compose)
ENV FRONTEND_DIR=/frontend

RUN DJANGO_SECRET_KEY=build-only-key python manage.py collectstatic --noinput --settings=config.settings.local

USER app
EXPOSE 8000
# gthread: har bir worker bir nechta so'rovni parallel bajaradi (yuklama testi asosida tanlangan)
CMD ["gunicorn", "config.wsgi", "-k", "gthread", "-w", "4", "--threads", "4", "-b", "0.0.0.0:8000", "--access-logfile", "-"]

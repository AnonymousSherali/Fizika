"""
Yuklangan fayllar (o'quvchi ishlari, moderatsiyadagi ishlanmalar) — maxfiy: tasodifiy nom bilan
media/private/ ga saqlanadi va faqat ruxsatni tekshiradigan API orqali beriladi.
Production'da nginx `/media/private/` ni tashqariga bermaydi (internal) — Django X-Accel-Redirect qaytaradi.
"""
import os
import uuid

from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.utils.deconstruct import deconstructible


@deconstructible
class PrivateUpload:
    """upload_to: private/<papka>/<uuid>.<kengaytma> — asl nom saqlanmaydi (taxmin qilib bo'lmaydi)."""

    def __init__(self, folder: str):
        self.folder = folder

    def __call__(self, instance, filename):
        ext = os.path.splitext(filename)[1].lower()[:10]
        return f"private/{self.folder}/{uuid.uuid4().hex}{ext}"


def serve_private(fieldfile, download_name: str, *, inline: bool = False):
    disposition = "inline" if inline else "attachment"
    if getattr(settings, "MEDIA_X_ACCEL", False):
        resp = HttpResponse()
        resp["X-Accel-Redirect"] = settings.MEDIA_URL + fieldfile.name
        resp["Content-Type"] = ""   # nginx fayl turini o'zi aniqlaydi
        resp["Content-Disposition"] = f'{disposition}; filename="{download_name}"'
        return resp
    return FileResponse(fieldfile.open("rb"), as_attachment=not inline, filename=download_name)


def delete_files_on_delete(sender, instance, **kwargs):
    """post_delete: yozuv o'chirilsa uning fayllari ham o'chiriladi (hisob o'chirilganda shaxsiy fayl qolmasin)."""
    for field in instance._meta.fields:
        if hasattr(field, "upload_to"):
            f = getattr(instance, field.name)
            if f and f.name:
                f.storage.delete(f.name)

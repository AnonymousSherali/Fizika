"""Yuklanadigan fayllarni tekshirish (FT-7.3): kengaytma, hajm va fayl ichidagi «sehrli» baytlar.
Kengaytmani o'zgartirib yuborilgan boshqa turdagi fayl (masalan .exe → .pdf) qabul qilinmaydi."""
import zipfile

from django.conf import settings
from rest_framework.exceptions import ValidationError


def _head(f, n=8):
    pos = f.tell()
    f.seek(0)
    data = f.read(n)
    f.seek(pos)
    return data


def validate_pdf(f):
    if not f.name.lower().endswith(".pdf"):
        raise ValidationError({"pdf": ["Faqat .pdf fayl"]})
    if f.size > settings.LESSON_PDF_MAX_MB * 1024 * 1024:
        raise ValidationError({"pdf": [f"PDF hajmi {settings.LESSON_PDF_MAX_MB} MB dan oshmasligi kerak"]})
    if _head(f, 5) != b"%PDF-":
        raise ValidationError({"pdf": ["Fayl PDF emas (ichki tuzilishi mos kelmadi)"]})
    return f


def validate_docx(f):
    if not f.name.lower().endswith(".docx"):
        raise ValidationError({"docx": ["Faqat .docx fayl"]})
    if f.size > settings.LESSON_DOCX_MAX_MB * 1024 * 1024:
        raise ValidationError({"docx": [f"DOCX hajmi {settings.LESSON_DOCX_MAX_MB} MB dan oshmasligi kerak"]})
    if _head(f, 4) != b"PK\x03\x04":
        raise ValidationError({"docx": ["Fayl DOCX emas"]})
    pos = f.tell()
    try:
        f.seek(0)
        with zipfile.ZipFile(f) as z:
            names = z.namelist()
            if "word/document.xml" not in names:
                raise ValidationError({"docx": ["DOCX ichida hujjat topilmadi"]})
            if any(n.lower().endswith(("vbaproject.bin",)) for n in names):
                raise ValidationError({"docx": ["Makrosli hujjat qabul qilinmaydi"]})
    except zipfile.BadZipFile as e:
        raise ValidationError({"docx": ["DOCX fayl buzilgan"]}) from e
    finally:
        f.seek(pos)
    return f

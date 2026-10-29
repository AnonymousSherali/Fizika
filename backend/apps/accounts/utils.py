import re
import secrets
import string

from django.core.exceptions import ValidationError

PHONE_RE = re.compile(r"^\+998\d{9}$")


def normalize_phone(raw: str | None) -> str | None:
    """'90 123-45-67', '998901234567', '+998 (90) 123 45 67' → '+998901234567'."""
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 9:
        digits = "998" + digits
    phone = "+" + digits
    if not PHONE_RE.match(phone):
        raise ValidationError("Telefon raqami noto'g'ri. Namuna: +998901234567")
    return phone


def normalize_email(raw: str | None) -> str | None:
    return raw.strip().lower() if raw else None


def mask_target(target: str) -> str:
    """Kod qayerga yuborilganini to'liq oshkor qilmaslik: +998*****4567, a***@mail.uz"""
    if "@" in target:
        name, domain = target.split("@", 1)
        return f"{name[:1]}***@{domain}"
    return target[:4] + "*****" + target[-4:]


# O'qilishi oson (0/O, 1/l kabi chalkash belgilarsiz) vaqtinchalik parol
_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def temp_password(length: int = 8) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


_TRANSLIT = str.maketrans({"ʻ": "", "ʼ": "", "'": "", "‘": "", "’": "", "`": ""})


def slug_login(first: str, last: str) -> str:
    """'Vali', "To'xtayev" → 'toxtayev.vali' (faqat lotin harf, raqam va nuqta)."""
    base = f"{last}.{first}".lower().translate(_TRANSLIT)
    base = re.sub(r"[^a-z0-9.]", "", base).strip(".")
    return base or "oquvchi"


def random_code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))

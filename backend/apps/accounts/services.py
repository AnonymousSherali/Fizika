"""Tasdiqlash kodlari, SMS/email yuborish, kirishni bloklash."""
import hashlib
import logging
from datetime import timedelta
from urllib import request as urlrequest
from urllib.parse import urlencode

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils import timezone

from .models import User, VerificationCode
from .utils import mask_target, random_code

log = logging.getLogger(__name__)


def _hash(code: str) -> str:
    return hashlib.sha256(f"{settings.SECRET_KEY}:{code}".encode()).hexdigest()


# ---------- SMS ----------
def send_sms(phone: str, text: str) -> None:
    provider = settings.SMS_PROVIDER
    if provider == "console":
        log.warning("SMS (console) %s: %s", phone, text)
        return
    if provider == "eskiz":
        # Eskiz.uz: https://documenter.getpostman.com/view/663428/RzfmES4z
        data = urlencode({"mobile_phone": phone.lstrip("+"), "message": text, "from": "4546"}).encode()
        req = urlrequest.Request(
            "https://notify.eskiz.uz/api/message/sms/send", data=data,
            headers={"Authorization": f"Bearer {settings.SMS_API_TOKEN}"},
        )
        # Manzil qat'iy (https, o'zgarmas)
        urlrequest.urlopen(req, timeout=10)  # noqa: S310  # nosec B310
        return
    raise RuntimeError(f"Noma'lum SMS provayder: {provider}")


def send_code(user: User, purpose: str) -> dict:
    """Yangi kod yaratadi va telefon (ustuvor) yoki emailga yuboradi."""
    if user.phone:
        channel, target = VerificationCode.Channel.SMS, user.phone
    elif user.email:
        channel, target = VerificationCode.Channel.EMAIL, user.email
    else:
        raise ValueError("Foydalanuvchida telefon ham, email ham yo'q")
    # Bitta hisobga soatiga ko'pi bilan 5 ta kod (pullik SMS'ni IP almashtirib «portlatish»ning oldini olish)
    sent_key = f"code-sent:{user.pk}"
    if cache.get(sent_key, 0) >= settings.VERIFICATION_CODES_PER_HOUR:
        from rest_framework.exceptions import Throttled

        raise Throttled(detail="Juda ko'p kod so'raldi. Birozdan keyin qayta urinib ko'ring")
    try:
        cache.incr(sent_key)
    except ValueError:
        cache.set(sent_key, 1, 3600)
    code = random_code()
    # Oldingi ishlatilmagan kodlar bekor qilinadi
    VerificationCode.objects.filter(user=user, purpose=purpose, used_at__isnull=True).update(
        used_at=timezone.now()
    )
    VerificationCode.objects.create(
        user=user, purpose=purpose, channel=channel, target=target, code_hash=_hash(code),
        expires_at=timezone.now() + timedelta(minutes=settings.VERIFICATION_CODE_TTL_MINUTES),
    )
    text = (
        f"Fizika 10-11: tasdiqlash kodi {code}" if purpose == VerificationCode.Purpose.VERIFY
        else f"Fizika 10-11: parolni tiklash kodi {code}"
    ) + f". {settings.VERIFICATION_CODE_TTL_MINUTES} daqiqa amal qiladi."
    if channel == VerificationCode.Channel.SMS:
        send_sms(target, text)
    else:
        send_mail("Fizika 10–11 — tasdiqlash kodi", text, None, [target])
    return {"channel": channel, "target": mask_target(target)}


def check_code(user: User, purpose: str, code: str) -> bool:
    vc = (
        VerificationCode.objects.filter(user=user, purpose=purpose, used_at__isnull=True)
        .order_by("-created_at").first()
    )
    if not vc or vc.expires_at < timezone.now() or vc.attempts >= settings.VERIFICATION_CODE_MAX_ATTEMPTS:
        return False
    if vc.code_hash != _hash(str(code).strip()):
        vc.attempts += 1
        vc.save(update_fields=["attempts", "updated_at"])
        return False
    vc.used_at = timezone.now()
    vc.save(update_fields=["used_at", "updated_at"])
    return True


# ---------- Kirishni bloklash (FT-1.8) ----------
def _lock_key(login: str) -> str:
    # Hisob topilsa — uning id si bo'yicha: «+998 90…», «90-123…», «901234567» bitta hisobning
    # turli yozilishi alohida hisoblagich bo'lib, bloklashni chetlab o'tishga imkon bermasin
    from .backends import find_user

    user = find_user(login)
    ident = f"user:{user.pk}" if user else "login:" + login.strip().lower()
    return "login-fail:" + hashlib.sha256(ident.encode()).hexdigest()


def is_locked(login: str) -> bool:
    return cache.get(_lock_key(login), 0) >= settings.LOGIN_MAX_FAILURES


def register_failure(login: str) -> None:
    key = _lock_key(login)
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, settings.LOGIN_LOCK_MINUTES * 60)


def reset_failures(login: str) -> None:
    cache.delete(_lock_key(login))


def client_ip(request) -> str | None:
    from apps.core.net import client_ip as _ip

    return _ip(request)


def blacklist_all_tokens(user: User) -> None:
    """Parol o'zgarganda / hisob o'chirilganda barcha refresh tokenlar bekor qilinadi."""
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    for t in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=t)

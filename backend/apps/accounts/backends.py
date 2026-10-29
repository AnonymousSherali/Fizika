from django.contrib.auth.backends import ModelBackend
from django.core.exceptions import ValidationError
from django.db.models import Q

from .models import User
from .utils import normalize_email, normalize_phone


def find_user(login: str) -> User | None:
    """Login, telefon yoki email bo'yicha foydalanuvchini topadi (FT-1.3)."""
    login = (login or "").strip()
    if not login:
        return None
    q = Q(username__iexact=login)
    if "@" in login:
        q |= Q(email=normalize_email(login))
    else:
        try:
            phone = normalize_phone(login)
        except ValidationError:
            phone = None
        if phone:
            q |= Q(phone=phone)
    return User.objects.filter(q).first()


class LoginBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, login=None, **kwargs):
        user = find_user(login or username)
        if user is None:
            # Vaqt bo'yicha hisob mavjudligini bilib olishning oldini olish
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

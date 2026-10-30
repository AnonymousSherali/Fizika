from django.contrib.auth import authenticate
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit import services as audit
from apps.core.exceptions import LoginFailed

from . import services
from .backends import find_user
from .models import LoginEvent, VerificationCode
from .serializers import (
    AuthResponseSerializer,
    LoginEventSerializer,
    LoginOnlySerializer,
    LoginSerializer,
    LogoutSerializer,
    MeUpdateSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    StudentRegisterSerializer,
    TeacherRegisterSerializer,
    UserSerializer,
    VerifySerializer,
    _validate_password,
    tokens_for,
)


def auth_payload(user):
    return {**tokens_for(user), "user": UserSerializer(user).data}


class ScopedAnon(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]


class TeacherRegisterView(ScopedAnon):
    throttle_scope = "register"

    @extend_schema(request=TeacherRegisterSerializer, responses={201: dict})
    def post(self, request):
        s = TeacherRegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        sent = services.send_code(user, VerificationCode.Purpose.VERIFY)
        return Response({"user": UserSerializer(user).data, "verification": sent}, status=201)


class StudentRegisterView(ScopedAnon):
    throttle_scope = "register"

    @extend_schema(request=StudentRegisterSerializer, responses={201: AuthResponseSerializer})
    def post(self, request):
        s = StudentRegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(auth_payload(user), status=201)


class VerifyView(ScopedAnon):
    throttle_scope = "code"

    @extend_schema(request=VerifySerializer, responses={200: AuthResponseSerializer})
    def post(self, request):
        s = VerifySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = find_user(s.validated_data["login"])
        if not user or not services.check_code(user, VerificationCode.Purpose.VERIFY, s.validated_data["code"]):
            raise ValidationError("Kod noto'g'ri yoki muddati o'tgan")
        user.is_verified = True
        user.save(update_fields=["is_verified"])
        return Response(auth_payload(user))


class ResendCodeView(ScopedAnon):
    throttle_scope = "code"

    @extend_schema(request=LoginOnlySerializer, responses={200: dict})
    def post(self, request):
        s = LoginOnlySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = find_user(s.validated_data["login"])
        if user and not user.is_verified and (user.phone or user.email):
            services.send_code(user, VerificationCode.Purpose.VERIFY)
        # Hisob bor-yo'qligini oshkor qilmaymiz
        return Response({"detail": "Agar hisob topilsa, yangi kod yuborildi"})


class LoginView(ScopedAnon):
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses={200: AuthResponseSerializer})
    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        login = s.validated_data["login"]
        ip, ua = services.client_ip(request), request.META.get("HTTP_USER_AGENT", "")[:300]
        if services.is_locked(login):
            raise LoginFailed("Juda ko'p noto'g'ri urinish. 15 daqiqadan keyin qayta urinib ko'ring",
                                       code="locked")
        user = authenticate(request, login=login, password=s.validated_data["password"])
        if user is None:
            services.register_failure(login)
            LoginEvent.objects.create(user=find_user(login), login=login[:120], ip=ip, user_agent=ua)
            audit.log(request, "auth.login_failed", after={"login": login[:120]})
            raise LoginFailed("Login yoki parol noto'g'ri", code="invalid_credentials")
        if user.is_teacher and not user.is_verified:
            raise LoginFailed("Hisob tasdiqlanmagan. SMS/email orqali kelgan kodni kiriting",
                                       code="not_verified")
        services.reset_failures(login)
        LoginEvent.objects.create(user=user, login=login[:120], ip=ip, user_agent=ua, success=True)
        audit.log(request, "auth.login", user, actor=user)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        return Response(auth_payload(user))


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=LogoutSerializer, responses={204: None})
    def post(self, request):
        s = LogoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            token = RefreshToken(s.validated_data["refresh"])
            if str(token["user_id"]) != str(request.user.id):
                raise ValidationError("Token boshqa foydalanuvchiga tegishli")
            token.blacklist()
        except TokenError as e:
            raise ValidationError("Token noto'g'ri yoki allaqachon bekor qilingan") from e
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetView(ScopedAnon):
    """FT-1.5: o'qituvchiga kod yuboriladi; o'quvchining parolini o'qituvchisi tiklaydi."""

    throttle_scope = "code"

    @extend_schema(request=LoginOnlySerializer, responses={200: dict})
    def post(self, request):
        s = LoginOnlySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = find_user(s.validated_data["login"])
        if user and user.is_active and (user.phone or user.email):
            services.send_code(user, VerificationCode.Purpose.RESET)
        return Response({"detail": "Agar hisob topilsa, kod yuborildi. O'quvchilar parolini "
                                   "o'qituvchisi tiklaydi."})


class PasswordResetConfirmView(ScopedAnon):
    throttle_scope = "code"

    @extend_schema(request=PasswordResetConfirmSerializer, responses={200: AuthResponseSerializer})
    def post(self, request):
        s = PasswordResetConfirmSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = find_user(s.validated_data["login"])
        if not user or not services.check_code(user, VerificationCode.Purpose.RESET, s.validated_data["code"]):
            raise ValidationError("Kod noto'g'ri yoki muddati o'tgan")
        try:
            _validate_password(s.validated_data["new_password"], user)
        except ValidationError as e:
            raise ValidationError({"new_password": e.detail}) from e
        user.set_password(s.validated_data["new_password"])
        user.is_verified = True  # kod qabul qilindi — telefon/email egasi tasdiqlandi
        user.must_change_password = False
        user.save()
        services.blacklist_all_tokens(user)
        services.reset_failures(s.validated_data["login"])
        audit.log(request, "auth.password_reset", user, actor=user)
        return Response(auth_payload(user))


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=PasswordChangeSerializer, responses={200: AuthResponseSerializer})
    def post(self, request):
        s = PasswordChangeSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        user = request.user
        user.set_password(s.validated_data["new_password"])
        user.must_change_password = False
        user.save()
        services.blacklist_all_tokens(user)
        audit.log(request, "auth.password_change", user)
        return Response(auth_payload(user))


class MeView(generics.RetrieveUpdateDestroyAPIView):
    """FT-1.6 profil; DELETE — FT-1.7 hisobni o'chirish so'rovi (30 kundan keyin tozalanadi)."""

    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        return MeUpdateSerializer if self.request.method in ("PATCH", "PUT") else UserSerializer

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        super().update(request, *args, **kwargs)
        return Response(UserSerializer(request.user).data)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        user.deletion_requested_at = timezone.now()
        user.is_active = False
        user.save(update_fields=["deletion_requested_at", "is_active"])
        services.blacklist_all_tokens(user)
        audit.log(request, "account.delete_requested", user)
        return Response({"detail": "Hisob o'chirishga navbatga qo'yildi. 30 kundan keyin barcha shaxsiy "
                                   "ma'lumotlar o'chiriladi."}, status=status.HTTP_202_ACCEPTED)


class MyLoginsView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LoginEventSerializer
    pagination_class = None

    def get_queryset(self):
        return LoginEvent.objects.filter(user=self.request.user)[:10]

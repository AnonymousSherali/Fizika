from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.schools.models import Classroom, ClassroomMember, Region, School

from .models import LoginEvent, Role, User
from .utils import normalize_email, normalize_phone


def tokens_for(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class UserSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="school.name", read_only=True, default=None)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "role", "phone", "email",
                  "school", "school_name", "language", "theme", "is_verified", "must_change_password"]
        read_only_fields = ["id", "username", "role", "phone", "email", "school", "is_verified",
                            "must_change_password"]


class MeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "language", "theme"]


class PasswordField(serializers.CharField):
    def __init__(self, **kwargs):
        kwargs.setdefault("write_only", True)
        kwargs.setdefault("style", {"input_type": "password"})
        kwargs.setdefault("trim_whitespace", False)
        super().__init__(**kwargs)


def _validate_password(password, user=None):
    try:
        validate_password(password, user)
    except DjangoValidationError as e:
        raise serializers.ValidationError(list(e.messages)) from e
    return password


class NewSchoolSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    region = serializers.ChoiceField(choices=Region.choices)
    district = serializers.CharField(max_length=100)
    number = serializers.CharField(max_length=20, required=False, allow_blank=True)


class TeacherRegisterSerializer(serializers.Serializer):
    """FT-1.1: o'qituvchi telefon yoki email bilan ro'yxatdan o'tadi va kod bilan tasdiqlaydi."""

    first_name = serializers.CharField(max_length=60)
    last_name = serializers.CharField(max_length=60)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = PasswordField()
    school_id = serializers.PrimaryKeyRelatedField(queryset=School.objects.all(), required=False,
                                                   allow_null=True, source="school")
    new_school = NewSchoolSerializer(required=False)

    def validate_phone(self, v):
        try:
            phone = normalize_phone(v)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages[0]) from e
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("Bu telefon raqami bilan hisob allaqachon bor")
        return phone

    def validate_email(self, v):
        email = normalize_email(v)
        if email and User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Bu email bilan hisob allaqachon bor")
        return email

    def validate_password(self, v):
        return _validate_password(v)

    def validate(self, data):
        if not data.get("phone") and not data.get("email"):
            raise serializers.ValidationError("Telefon raqami yoki email kiriting")
        if not data.get("school") and not data.get("new_school"):
            raise serializers.ValidationError("Maktabni tanlang yoki yangisini kiriting")
        return data

    @transaction.atomic
    def create(self, data):
        school = data.get("school") or School.objects.create(**data["new_school"])
        login = data.get("phone") or data["email"]
        user = User(
            username=login.lstrip("+"), first_name=data["first_name"], last_name=data["last_name"],
            phone=data.get("phone"), email=data.get("email"), role=Role.TEACHER, school=school,
            is_verified=False,
        )
        user.set_password(data["password"])
        user.save()
        return user


class UsernameField(serializers.RegexField):
    def __init__(self, **kwargs):
        super().__init__(
            r"^[a-zA-Z0-9._]{3,40}$", max_length=40,
            error_messages={"invalid": "Login 3–40 belgi: lotin harflari, raqam, nuqta va _"},
            **kwargs,
        )


class StudentRegisterSerializer(serializers.Serializer):
    """FT-1.2: o'quvchi o'qituvchi bergan sinf kodi bilan ro'yxatdan o'tadi."""

    join_code = serializers.CharField(max_length=12)
    first_name = serializers.CharField(max_length=60)
    last_name = serializers.CharField(max_length=60)
    username = UsernameField()
    password = PasswordField()

    def validate_join_code(self, v):
        classroom = Classroom.objects.filter(join_code__iexact=v.strip()).first()
        if not classroom or not classroom.join_code_active:
            raise serializers.ValidationError("Sinf kodi noto'g'ri yoki muddati o'tgan")
        self.context["classroom"] = classroom
        return v

    def validate_username(self, v):
        if User.objects.filter(username__iexact=v).exists():
            raise serializers.ValidationError("Bu login band. Boshqasini tanlang")
        return v.lower()

    def validate_password(self, v):
        return _validate_password(v)

    @transaction.atomic
    def create(self, data):
        classroom = self.context["classroom"]
        user = User(username=data["username"], first_name=data["first_name"], last_name=data["last_name"],
                    role=Role.STUDENT, school=classroom.school, is_verified=True)
        user.set_password(data["password"])
        user.save()
        ClassroomMember.objects.create(classroom=classroom, user=user, role=ClassroomMember.Role.STUDENT)
        return user


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=120)
    password = PasswordField()


class VerifySerializer(serializers.Serializer):
    login = serializers.CharField(max_length=120)
    code = serializers.CharField(max_length=10)


class LoginOnlySerializer(serializers.Serializer):
    login = serializers.CharField(max_length=120)


class PasswordResetConfirmSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=120)
    code = serializers.CharField(max_length=10)
    new_password = PasswordField()


class PasswordChangeSerializer(serializers.Serializer):
    old_password = PasswordField()
    new_password = PasswordField()

    def validate(self, data):
        user = self.context["request"].user
        if not user.check_password(data["old_password"]):
            raise serializers.ValidationError({"old_password": ["Joriy parol noto'g'ri"]})
        _validate_password(data["new_password"], user)
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class LoginEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginEvent
        fields = ["created_at", "ip", "user_agent", "success"]


class AuthResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()

from rest_framework import serializers

from apps.accounts.models import User

from .models import Classroom, ClassroomMember, School


class SchoolSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source="get_region_display", read_only=True)

    class Meta:
        model = School
        fields = ["id", "name", "region", "region_name", "district", "number", "is_verified"]
        read_only_fields = ["is_verified"]


class MemberUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "last_login", "must_change_password"]


class ClassroomSerializer(serializers.ModelSerializer):
    student_count = serializers.IntegerField(read_only=True)
    my_role = serializers.SerializerMethodField()
    teachers = serializers.SerializerMethodField()
    school_name = serializers.CharField(source="school.name", read_only=True, default=None)

    class Meta:
        model = Classroom
        fields = ["id", "name", "grade", "academic_year", "school", "school_name", "join_code",
                  "join_code_expires_at", "is_archived", "student_count", "my_role", "teachers", "created_at"]
        read_only_fields = ["school", "join_code", "join_code_expires_at", "created_at"]

    def get_my_role(self, obj) -> str | None:
        roles = getattr(obj, "_my_role", None)
        if roles is not None:
            return roles
        # memberships oldindan yuklangan (prefetch) — har qator uchun alohida so'rov yuborilmaydi
        uid = self.context["request"].user.id
        m = next((m for m in obj.memberships.all() if m.user_id == uid), None)
        return m.role if m else None

    def get_teachers(self, obj) -> list[dict]:
        return [
            {"id": str(m.user_id), "name": f"{m.user.last_name} {m.user.first_name}".strip(), "role": m.role}
            for m in obj.memberships.all()
            if m.role != ClassroomMember.Role.STUDENT
        ]

    def to_representation(self, obj):
        data = super().to_representation(obj)
        # Qo'shilish kodini faqat sinf o'qituvchilari ko'radi
        if data.get("my_role") not in (ClassroomMember.Role.TEACHER, ClassroomMember.Role.ASSISTANT):
            if not self.context["request"].user.is_platform_admin:
                data.pop("join_code", None)
                data.pop("join_code_expires_at", None)
        return data


class JoinCodeSerializer(serializers.Serializer):
    expires_days = serializers.IntegerField(min_value=1, max_value=365, required=False, allow_null=True,
                                            default=7, help_text="null — muddatsiz")


class JoinSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=12)


class StudentRowSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=60)
    last_name = serializers.CharField(max_length=60)


class StudentImportSerializer(serializers.Serializer):
    """JSON ro'yxat yoki CSV/XLSX fayl (ustunlar: Familiya, Ism)."""

    students = StudentRowSerializer(many=True, required=False)
    file = serializers.FileField(required=False)

    def validate(self, data):
        if not data.get("students") and not data.get("file"):
            raise serializers.ValidationError("O'quvchilar ro'yxati yoki fayl yuboring")
        return data


class MoveSerializer(serializers.Serializer):
    classroom_id = serializers.IntegerField()


class AddTeacherSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=120, help_text="O'qituvchining telefoni, emaili yoki logini")
    role = serializers.ChoiceField(choices=[ClassroomMember.Role.ASSISTANT, ClassroomMember.Role.TEACHER],
                                   default=ClassroomMember.Role.ASSISTANT)

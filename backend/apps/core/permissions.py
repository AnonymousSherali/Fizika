from rest_framework.permissions import BasePermission


class IsTeacher(BasePermission):
    """O'qituvchi (yoki administrator)."""

    message = "Bu amal faqat o'qituvchilar uchun"

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_teacher or u.is_platform_admin))


class IsStudent(BasePermission):
    message = "Bu amal faqat o'quvchilar uchun"

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_student)

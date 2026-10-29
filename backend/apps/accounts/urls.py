from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("auth/register/teacher/", views.TeacherRegisterView.as_view(), name="register-teacher"),
    path("auth/register/student/", views.StudentRegisterView.as_view(), name="register-student"),
    path("auth/verify/", views.VerifyView.as_view(), name="verify"),
    path("auth/verify/resend/", views.ResendCodeView.as_view(), name="verify-resend"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/password/reset/", views.PasswordResetView.as_view(), name="password-reset"),
    path("auth/password/reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("auth/password/change/", views.PasswordChangeView.as_view(), name="password-change"),
    path("me/", views.MeView.as_view(), name="me"),
    path("me/logins/", views.MyLoginsView.as_view(), name="me-logins"),
]

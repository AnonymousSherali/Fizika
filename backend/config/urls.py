from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

admin.site.site_header = "Fizika 10–11 — boshqaruv paneli"
admin.site.site_title = "Fizika 10–11"
admin.site.index_title = "Boshqaruv"

api_v1 = [
    path("", include("apps.core.urls")),
    path("", include("apps.accounts.urls")),
    path("", include("apps.schools.urls")),
    path("", include("apps.simulations.urls")),
    path("", include("apps.labs.urls")),
    path("", include("apps.quizzes.urls")),
    path("", include("apps.assignments.urls")),
    path("", include("apps.analytics.urls")),
    path("", include("apps.notifications.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

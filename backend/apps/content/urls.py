from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import LessonPlanViewSet, RuDictionaryView

router = SimpleRouter(trailing_slash=True)
router.register("lesson-plans", LessonPlanViewSet, basename="lesson-plan")

urlpatterns = [
    path("i18n/ru.js", RuDictionaryView.as_view(), name="i18n-ru"),
    path("", include(router.urls)),
]

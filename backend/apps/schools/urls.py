from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import ClassroomViewSet, JoinClassroomView, SchoolViewSet

router = SimpleRouter(trailing_slash=True)
router.register("schools", SchoolViewSet, basename="school")
router.register("classrooms", ClassroomViewSet, basename="classroom")

urlpatterns = [
    # "join" router'dagi {pk} dan oldin turishi kerak
    path("classrooms/join/", JoinClassroomView.as_view(), name="classroom-join"),
    path("", include(router.urls)),
]

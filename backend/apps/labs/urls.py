from rest_framework.routers import SimpleRouter

from .views import LabJournalViewSet

router = SimpleRouter(trailing_slash=True)
router.register("labs", LabJournalViewSet, basename="lab")

urlpatterns = router.urls

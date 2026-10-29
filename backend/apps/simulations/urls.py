from rest_framework.routers import SimpleRouter

from .views import SimulationViewSet

router = SimpleRouter(trailing_slash=True)
router.register("simulations", SimulationViewSet, basename="simulation")

urlpatterns = router.urls

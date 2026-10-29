from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import AttemptViewSet, PracticeView, ProblemViewSet, QuestionViewSet, TopicListView

router = SimpleRouter(trailing_slash=True)
router.register("quiz/attempts", AttemptViewSet, basename="quiz-attempt")
router.register("quiz/questions", QuestionViewSet, basename="quiz-question")
router.register("quiz/problems", ProblemViewSet, basename="quiz-problem")

urlpatterns = [
    path("quiz/topics/", TopicListView.as_view(), name="quiz-topics"),
    path("quiz/practice/", PracticeView.as_view(), name="quiz-practice"),
    path("", include(router.urls)),
]

from django.urls import path

from . import views

urlpatterns = [
    path("analytics/classrooms/<int:pk>/", views.ClassroomSummaryView.as_view(), name="analytics-classroom"),
    path("analytics/classrooms/<int:pk>/heatmap/", views.ClassroomHeatmapView.as_view(), name="analytics-heatmap"),
    path("analytics/classrooms/<int:pk>/export.xlsx", views.ClassroomExportView.as_view(), name="analytics-export"),
    path("analytics/students/<uuid:pk>/", views.StudentCardView.as_view(), name="analytics-student"),
    path("analytics/platform/", views.PlatformStatsView.as_view(), name="analytics-platform"),
]

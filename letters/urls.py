from django.urls import path
from . import views
app_name = "letters"
urlpatterns = [path("", views.home, name="home"), path("health/", views.health, name="health")]

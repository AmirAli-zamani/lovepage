from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.cache import never_cache
from .content import load_letter

@never_cache
def home(request):
    response = render(request, "letters/home.html", {"letter": load_letter()})
    response["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    return response

def health(request):
    return JsonResponse({"status": "ok"})

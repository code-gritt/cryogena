from django.contrib.auth import authenticate
from .models import CustomUser


class TokenAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                user = CustomUser.objects.get(id=int(token))
                request.user = user
            except (CustomUser.DoesNotExist, ValueError):
                pass  # Leave request.user as AnonymousUser
        return self.get_response(request)

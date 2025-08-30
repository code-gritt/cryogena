from django.utils.functional import SimpleLazyObject
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication


def get_user_from_token(request):
    """
    Resolve user from Authorization: Bearer <token> using SimpleJWT.
    Returns AnonymousUser if invalid or missing.
    """
    auth = JWTAuthentication()
    try:
        user_auth_tuple = auth.authenticate(request)
        if user_auth_tuple is not None:
            return user_auth_tuple[0]  # user object
    except Exception:
        return AnonymousUser()
    return AnonymousUser()


class TokenAuthenticationMiddleware:
    """
    Middleware that attaches request.user from JWT token.
    Works with DRF SimpleJWT.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.user = SimpleLazyObject(lambda: get_user_from_token(request))
        return self.get_response(request)

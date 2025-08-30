import graphene
from graphene_django import DjangoObjectType
from django.contrib.auth import authenticate
from .models import CustomUser
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from dj_rest_auth.registration.views import SocialLoginView
from django.test import RequestFactory
from .views import GoogleLogin


# -------------------------
# Helper to generate JWTs
# -------------------------
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# -------------------------
# GraphQL User Type
# -------------------------
class UserType(DjangoObjectType):
    class Meta:
        model = CustomUser
        fields = ("id", "username", "email", "credits", "avatar_initials")


# -------------------------
# Register Mutation
# -------------------------
class RegisterMutation(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    user = graphene.Field(UserType)
    token = graphene.String()

    def mutate(self, info, username, email, password):
        user = CustomUser.objects.create_user(
            username=username, email=email, password=password
        )
        token = get_tokens_for_user(user)["access"]
        return RegisterMutation(user=user, token=token)


# -------------------------
# Login Mutation
# -------------------------
class LoginMutation(graphene.Mutation):
    class Arguments:
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    user = graphene.Field(UserType)
    token = graphene.String()

    def mutate(self, info, email, password):
        user = authenticate(email=email, password=password)
        if not user:
            raise Exception("Invalid credentials")
        token = get_tokens_for_user(user)["access"]
        return LoginMutation(user=user, token=token)


# -------------------------
# Google Login Mutation
# -------------------------
class GoogleLoginMutation(graphene.Mutation):
    class Arguments:
        access_token = graphene.String(required=True)

    user = graphene.Field(UserType)
    token = graphene.String()

    def mutate(self, info, access_token):
        factory = RequestFactory()
        request = factory.post("/accounts/google/login/")
        request.data = {"access_token": access_token}
        request.user = None
        request.META = info.context.META
        request.COOKIES = info.context.COOKIES

        view = GoogleLogin.as_view()
        response = view(request)

        if response.status_code != 200:
            raise Exception(f"Google login failed: {response.data}")

        user = request.user or response.data.get("user")
        token = get_tokens_for_user(user)["access"]
        return GoogleLoginMutation(user=user, token=token)

# -------------------------
# GraphQL Mutation & Query
# -------------------------


class Mutation(graphene.ObjectType):
    register = RegisterMutation.Field()
    login = LoginMutation.Field()
    google_login = GoogleLoginMutation.Field()


class Query(graphene.ObjectType):
    me = graphene.Field(UserType)

    def resolve_me(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")
        return user


# -------------------------
# GraphQL Schema
# -------------------------
schema = graphene.Schema(query=Query, mutation=Mutation)

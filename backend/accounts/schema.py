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
        # Verify the token with Google
        response = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": access_token}
        )
        data = response.json()

        if "email" not in data:
            raise Exception("Invalid Google token")

        email = data["email"]
        username = data.get("name") or email.split("@")[0]

        # Get or create the user
        user, created = CustomUser.objects.get_or_create(
            email=email,
            defaults={"username": username}
        )

        # Generate JWT token
        refresh = RefreshToken.for_user(user)
        token = str(refresh.access_token)

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

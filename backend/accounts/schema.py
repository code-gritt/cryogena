import graphene
from graphene_django import DjangoObjectType
from django.contrib.auth import authenticate
from .models import CustomUser
from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client


class UserType(DjangoObjectType):
    class Meta:
        model = CustomUser
        fields = ("id", "username", "email", "credits", "avatar_initials")


class RegisterMutation(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    user = graphene.Field(UserType)
    token = graphene.String()

    def mutate(self, info, username, email, password):
        user = CustomUser.objects.create_user(
            username=username, email=email, password=password)
        token = str(user.id)  # Simplified demo token
        return RegisterMutation(user=user, token=token)


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
        token = str(user.id)  # Simplified demo token
        return LoginMutation(user=user, token=token)


class GoogleLoginMutation(graphene.Mutation):
    class Arguments:
        access_token = graphene.String(required=True)

    user = graphene.Field(UserType)
    token = graphene.String()

    def mutate(self, info, access_token):
        # Use dj-rest-auth's SocialLoginView to handle Google OAuth
        request = info.context
        social_login = SocialLoginView.as_view(
            adapter_class=GoogleOAuth2Adapter,
            client_class=OAuth2Client,
        )
        # Mock the request data for dj-rest-auth
        request.data = {"access_token": access_token}
        response = social_login(request)
        if response.status_code != 200:
            raise Exception("Google login failed")
        user = request.user
        token = response.data.get("access_token", str(user.id))
        return GoogleLoginMutation(user=user, token=token)


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


schema = graphene.Schema(query=Query, mutation=Mutation)

import graphene
from graphene_django import DjangoObjectType
from django.contrib.auth import authenticate
from .models import CustomUser
from allauth.socialaccount.providers.google.provider import GoogleProvider
from allauth.socialaccount.models import SocialLogin, SocialAccount, SocialToken
from allauth.socialaccount.providers.oauth2.client import OAuth2Client, OAuth2Error
from allauth.socialaccount.helpers import complete_social_login


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
        try:
            # Initialize Google provider
            provider = GoogleProvider(info.context)
            app = provider.get_app(info.context)

            # Create OAuth2 client
            client = OAuth2Client(
                request=info.context,
                consumer_key=app.client_id,
                consumer_secret=app.secret,
                access_token_url="https://oauth2.googleapis.com/token",
                authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
                api_base_url="https://www.googleapis.com/oauth2/v1/",
            )

            # Exchange access token for user data
            try:
                user_data = client.get_profile_info(access_token)
            except OAuth2Error as e:
                raise Exception(f"Failed to fetch user data: {str(e)}")

            # Create social login object
            social_account = SocialAccount(
                provider=provider.id,
                uid=user_data.get("sub"),
                extra_data=user_data,
            )
            social_login = SocialLogin(account=social_account)

            # Populate user data
            email = user_data.get("email")
            if not email:
                raise Exception("Email not provided by Google")

            # Check if user exists, or create new
            try:
                social_account = SocialAccount.objects.get(
                    provider=provider.id, uid=user_data.get("sub")
                )
                user = social_account.user
            except SocialAccount.DoesNotExist:
                user = CustomUser(
                    email=email,
                    username=user_data.get("name", email.split("@")[0]),
                    avatar_initials="".join(
                        word[0].upper() for word in user_data.get("name", email.split("@")[0]).split()[:2]
                    ),
                    credits=100,
                )
                user.save()
                social_account.user = user
                social_account.save()

            # Complete social login
            social_login.user = user
            complete_social_login(info.context, social_login)

            # Store access token
            SocialToken.objects.update_or_create(
                account=social_account,
                defaults={"token": access_token,
                          "token_secret": "", "expires_at": None},
            )

            token = str(user.id)  # Simplified demo token
            return GoogleLoginMutation(user=user, token=token)
        except Exception as e:
            raise Exception(f"Google login failed: {str(e)}")


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

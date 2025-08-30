import graphene
from graphene_django import DjangoObjectType
from django.contrib.auth import authenticate
from .models import CustomUser, File, Folder
from django.db.models import Sum, Count
from allauth.socialaccount.providers.google.provider import GoogleProvider
from allauth.socialaccount.models import SocialLogin, SocialAccount, SocialToken
from allauth.socialaccount.providers.oauth2.client import OAuth2Client, OAuth2Error
from allauth.socialaccount.helpers import complete_social_login


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


class FileType(DjangoObjectType):
    class Meta:
        model = File
        fields = ('id', 'name', 'created_at', 'size')

    owner_avatar = graphene.String()

    def resolve_owner_avatar(self, info):
        return self.owner.avatar_initials


class DashboardStatsType(graphene.ObjectType):
    images_count = graphene.Int()
    pdfs_count = graphene.Int()
    docs_count = graphene.Int()
    folders_count = graphene.Int()
    mp3s_count = graphene.Int()
    videos_count = graphene.Int()
    total_storage_used = graphene.Int()
    storage_limit = graphene.Int()

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
        try:
            provider = GoogleProvider(info.context)
            app = provider.get_app(info.context)
            client = OAuth2Client(
                request=info.context,
                consumer_key=app.client_id,
                consumer_secret=app.secret,
                access_token_url="https://oauth2.googleapis.com/token",
                authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
                api_base_url="https://www.googleapis.com/oauth2/v1/",
            )
            user_data = client.get_profile_info(access_token)
            social_account, created = SocialAccount.objects.get_or_create(
                provider=provider.id,
                uid=user_data.get("sub"),
                defaults={"extra_data": user_data}
            )
            if created:
                user = CustomUser(
                    email=user_data.get("email"),
                    username=user_data.get(
                        "name", user_data.get("email").split("@")[0]),
                    avatar_initials="".join(
                        word[0].upper() for word in user_data.get("name", user_data.get("email").split("@")[0]).split()[:2]
                    ),
                    credits=100,
                )
                user.save()
                social_account.user = user
                social_account.save()
            else:
                user = social_account.user
            social_login = SocialLogin(account=social_account, user=user)
            complete_social_login(info.context, social_login)
            SocialToken.objects.update_or_create(
                account=social_account,
                defaults={"token": access_token,
                          "token_secret": "", "expires_at": None},
            )
            token = str(user.id)  # Simplified demo token
            return GoogleLoginMutation(user=user, token=token)
        except Exception as e:
            raise Exception(f"Google login failed: {str(e)}")
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

    dashboard_stats = graphene.Field(DashboardStatsType)

    def resolve_dashboard_stats(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        files = File.objects.filter(owner=user, is_deleted=False)
        folders = Folder.objects.filter(owner=user)

        images_count = files.filter(file_type='image').count()
        pdfs_count = files.filter(file_type='pdf').count()
        docs_count = files.filter(file_type='doc').count()
        mp3s_count = files.filter(file_type='mp3').count()
        videos_count = files.filter(file_type='video').count()
        folders_count = folders.count()

        total_storage_used = files.aggregate(total_size=Sum('size'))[
            'total_size'] or 0

        return DashboardStatsType(
            images_count=images_count,
            pdfs_count=pdfs_count,
            docs_count=docs_count,
            folders_count=folders_count,
            mp3s_count=mp3s_count,
            videos_count=videos_count,
            total_storage_used=total_storage_used,
            storage_limit=user.storage_limit
        )

    user_files = graphene.List(FileType)

    def resolve_user_files(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")
        return File.objects.filter(owner=user, is_deleted=False).order_by('-created_at')


# -------------------------
# GraphQL Schema
# -------------------------
schema = graphene.Schema(query=Query, mutation=Mutation)

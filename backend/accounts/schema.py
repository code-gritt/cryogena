from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import os
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.socialaccount.models import SocialAccount
from django.db.models import Sum
from .models import CustomUser, File, Folder
from django.contrib.auth import authenticate
from graphene_file_upload.scalars import Upload
from graphene_django import DjangoObjectType
import graphene


# Helper to generate JWTs
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# User type
class UserType(DjangoObjectType):
    class Meta:
        model = CustomUser
        fields = ("id", "username", "email", "credits", "avatar_initials")


# File type
class FileType(DjangoObjectType):
    class Meta:
        model = File
        fields = ("id", "name", "created_at", "size", "file_type", "file")

    owner_avatar = graphene.String()
    file_url = graphene.String()

    def resolve_owner_avatar(self, info):
        return self.owner.avatar_initials

    def resolve_file_url(self, info):
        return self.file.url if self.file else ""


# Folder type
class FolderType(DjangoObjectType):
    class Meta:
        model = Folder
        fields = ("id", "name", "created_at", "parent")


# Dashboard stats type
class DashboardStatsType(graphene.ObjectType):
    images_count = graphene.Int()
    pdfs_count = graphene.Int()
    docs_count = graphene.Int()
    folders_count = graphene.Int()
    mp3s_count = graphene.Int()
    videos_count = graphene.Int()
    total_storage_used = graphene.Int()
    storage_limit = graphene.Int()


# Folder contents type
class FolderContentsType(graphene.ObjectType):
    files = graphene.List(FileType)
    folders = graphene.List(FolderType)


# Bin contents type
class BinContentsType(graphene.ObjectType):
    files = graphene.List(FileType)
    folders = graphene.List(FolderType)


# Folder info type
class FolderInfoType(graphene.ObjectType):
    id = graphene.ID()
    name = graphene.String()
    parent_id = graphene.ID()


# Upload file mutation
class UploadFileMutation(graphene.Mutation):
    class Arguments:
        files = graphene.List(Upload, required=True)
        folder_id = graphene.ID(required=False)

    success = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, files, folder_id=None):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        # Storage check
        total_storage_used = File.objects.filter(owner=user, is_deleted=False).aggregate(
            total_size=Sum('size')
        )['total_size'] or 0
        new_files_size = sum(f.size for f in files)
        if total_storage_used + new_files_size > user.storage_limit:
            raise Exception("Storage limit exceeded. Upgrade your plan.")

        # Folder check
        folder = None
        if folder_id:
            try:
                folder = Folder.objects.get(
                    id=folder_id, owner=user, is_deleted=False)
            except Folder.DoesNotExist:
                raise Exception("Folder not found")

        # ⚡ Deduct credits (e.g., 1 credit per file uploaded)
        cost_per_file = 1
        total_cost = len(files) * cost_per_file

        if user.credits < total_cost:
            raise Exception("Not enough credits to upload files")

        user.credits -= total_cost
        user.save()

        # Save files
        for uploaded_file in files:
            file_extension = uploaded_file.name.split('.')[-1].lower()
            file_type = (
                'image' if file_extension in ['jpg', 'jpeg', 'png', 'gif']
                else 'pdf' if file_extension == 'pdf'
                else 'doc' if file_extension in ['doc', 'docx']
                else 'mp3' if file_extension == 'mp3'
                else 'video' if file_extension == 'mp4'
                else 'other'
            )

            File.objects.create(
                name=uploaded_file.name,
                owner=user,
                folder=folder,
                size=uploaded_file.size,
                file_type=file_type,
                file=uploaded_file
            )

        return UploadFileMutation(success=True, message="Files uploaded successfully. Credits deducted.")

# Folder mutations


class CreateFolderMutation(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        parent_id = graphene.ID(required=False)

    folder = graphene.Field(lambda: FolderType)

    def mutate(self, info, name, parent_id=None):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        parent = None
        if parent_id:
            try:
                parent = Folder.objects.get(
                    id=parent_id, owner=user, is_deleted=False)
            except Folder.DoesNotExist:
                raise Exception("Parent folder not found")

        folder = Folder.objects.create(name=name, owner=user, parent=parent)
        return CreateFolderMutation(folder=folder)


class RenameFileMutation(graphene.Mutation):
    class Arguments:
        file_id = graphene.ID(required=True)
        new_name = graphene.String(required=True)

    success = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, file_id, new_name):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        try:
            file = File.objects.get(id=file_id, owner=user, is_deleted=False)
            file.name = new_name
            file.save()
            return RenameFileMutation(success=True, message="File renamed successfully")
        except File.DoesNotExist:
            raise Exception("File not found")


class RenameFolderMutation(graphene.Mutation):
    class Arguments:
        folder_id = graphene.ID(required=True)
        new_name = graphene.String(required=True)

    success = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, folder_id, new_name):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        try:
            folder = Folder.objects.get(
                id=folder_id, owner=user, is_deleted=False)
            folder.name = new_name
            folder.save()
            return RenameFolderMutation(success=True, message="Folder renamed successfully")
        except Folder.DoesNotExist:
            raise Exception("Folder not found")


class DeleteFileMutation(graphene.Mutation):
    class Arguments:
        file_id = graphene.ID(required=True)

    success = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, file_id):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        try:
            file = File.objects.get(id=file_id, owner=user, is_deleted=False)
            file.is_deleted = True
            file.save()
            return DeleteFileMutation(success=True, message="File moved to bin")
        except File.DoesNotExist:
            raise Exception("File not found")


class DeleteFolderMutation(graphene.Mutation):
    class Arguments:
        folder_id = graphene.ID(required=True)

    success = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, folder_id):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        try:
            folder = Folder.objects.get(
                id=folder_id, owner=user, is_deleted=False)
            folder.is_deleted = True
            folder.save()
            # Soft-delete all files in the folder
            File.objects.filter(folder=folder, owner=user,
                                is_deleted=False).update(is_deleted=True)
            # Soft-delete all subfolders
            Folder.objects.filter(parent=folder, owner=user,
                                  is_deleted=False).update(is_deleted=True)
            return DeleteFolderMutation(success=True, message="Folder moved to bin")
        except Folder.DoesNotExist:
            raise Exception("Folder not found")


class DeleteFileForeverMutation(graphene.Mutation):
    class Arguments:
        file_id = graphene.ID(required=True)

    success = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, file_id):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        try:
            file = File.objects.get(id=file_id, owner=user, is_deleted=True)
            file.delete()
            return DeleteFileForeverMutation(success=True, message="File permanently deleted")
        except File.DoesNotExist:
            raise Exception("File not found in bin")


class DeleteFolderForeverMutation(graphene.Mutation):
    class Arguments:
        folder_id = graphene.ID(required=True)

    success = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, folder_id):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        try:
            folder = Folder.objects.get(
                id=folder_id, owner=user, is_deleted=True)
            # Delete all files in the folder
            File.objects.filter(folder=folder, owner=user,
                                is_deleted=True).delete()
            # Delete all subfolders recursively
            Folder.objects.filter(parent=folder, owner=user,
                                  is_deleted=True).delete()
            folder.delete()
            return DeleteFolderForeverMutation(success=True, message="Folder permanently deleted")
        except Folder.DoesNotExist:
            raise Exception("Folder not found in bin")


# Auth mutations
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


class GoogleLoginMutation(graphene.Mutation):
    class Arguments:
        access_token = graphene.String(required=True)

    user = graphene.Field(UserType)
    token = graphene.String()

    def mutate(self, info, access_token):
        try:
            idinfo = id_token.verify_oauth2_token(
                access_token,
                google_requests.Request(),
                os.getenv("GOOGLE_CLIENT_ID"),
            )
            email = idinfo["email"]
            name = idinfo.get("name", email.split("@")[0])
            user, _ = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    "username": name,
                    "avatar_initials": "".join(word[0].upper() for word in name.split()[:2]),
                    "credits": 100,
                },
            )
            token = get_tokens_for_user(user)["access"]
            return GoogleLoginMutation(user=user, token=token)
        except Exception as e:
            raise Exception(f"Google login failed: {str(e)}")


class Query(graphene.ObjectType):
    me = graphene.Field(UserType)
    dashboard_stats = graphene.Field(DashboardStatsType)
    user_files = graphene.List(FileType)
    user_folders = graphene.List(FolderType)
    folder_contents = graphene.Field(
        FolderContentsType, folder_id=graphene.ID(required=True))
    folder_info = graphene.Field(
        FolderInfoType, folder_id=graphene.ID(required=True))
    bin_contents = graphene.Field(BinContentsType)

    def resolve_me(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")
        return user

    def resolve_dashboard_stats(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")
        files = File.objects.filter(owner=user, is_deleted=False)
        folders = Folder.objects.filter(owner=user, is_deleted=False)
        return DashboardStatsType(
            images_count=files.filter(file_type='image').count(),
            pdfs_count=files.filter(file_type='pdf').count(),
            docs_count=files.filter(file_type='doc').count(),
            mp3s_count=files.filter(file_type='mp3').count(),
            videos_count=files.filter(file_type='video').count(),
            folders_count=folders.count(),
            total_storage_used=files.aggregate(total_size=Sum('size'))[
                'total_size'] or 0,
            storage_limit=user.storage_limit,
        )

    def resolve_user_files(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")
        return File.objects.filter(owner=user, is_deleted=False).order_by('-created_at')

    def resolve_user_folders(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")
        return Folder.objects.filter(owner=user, is_deleted=False).order_by('-created_at')

    def resolve_folder_contents(self, info, folder_id):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")
        try:
            folder = Folder.objects.get(
                id=folder_id, owner=user, is_deleted=False)
        except Folder.DoesNotExist:
            raise Exception("Folder not found or not accessible")
        return FolderContentsType(
            files=File.objects.filter(
                owner=user, folder_id=folder_id, is_deleted=False).order_by('-created_at'),
            folders=Folder.objects.filter(
                owner=user, parent_id=folder_id, is_deleted=False).order_by('-created_at')
        )

    def resolve_folder_info(self, info, folder_id):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")
        try:
            folder = Folder.objects.get(
                id=folder_id, owner=user, is_deleted=False)
            return FolderInfoType(
                id=folder.id,
                name=folder.name,
                parent_id=folder.parent_id if folder.parent else None
            )
        except Folder.DoesNotExist:
            raise Exception("Folder not found or not accessible")

    def resolve_bin_contents(self, info):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")
        return BinContentsType(
            files=File.objects.filter(
                owner=user, is_deleted=True).order_by('-created_at'),
            folders=Folder.objects.filter(
                owner=user, is_deleted=True).order_by('-created_at')
        )

# Move File Mutation


class MoveFileMutation(graphene.Mutation):
    class Arguments:
        file_id = graphene.ID(required=True)
        folder_id = graphene.ID(required=False)  # null for root

    success = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, file_id, folder_id=None):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        try:
            file = File.objects.get(id=file_id, owner=user, is_deleted=False)
            folder = None
            if folder_id:
                folder = Folder.objects.get(
                    id=folder_id, owner=user, is_deleted=False)
            file.folder = folder
            file.save()
            return MoveFileMutation(success=True, message="File moved successfully")
        except File.DoesNotExist:
            raise Exception("File not found")
        except Folder.DoesNotExist:
            raise Exception("Target folder not found")

# Move Folder Mutation


class MoveFolderMutation(graphene.Mutation):
    class Arguments:
        folder_id = graphene.ID(required=True)
        parent_id = graphene.ID(required=False)  # null for root

    success = graphene.Boolean()
    message = graphene.String()

    def mutate(self, info, folder_id, parent_id=None):
        user = info.context.user
        if user.is_anonymous:
            raise Exception("Not authenticated")

        try:
            folder = Folder.objects.get(
                id=folder_id, owner=user, is_deleted=False)
            new_parent = None
            if parent_id:
                new_parent = Folder.objects.get(
                    id=parent_id, owner=user, is_deleted=False)
                # Check for circular reference
                current = new_parent
                while current:
                    if current.id == folder_id:
                        raise Exception(
                            "Cannot move folder into itself or its descendants")
                    current = current.parent
            folder.parent = new_parent
            folder.save()
            return MoveFolderMutation(success=True, message="Folder moved successfully")
        except Folder.DoesNotExist:
            raise Exception("Folder or target parent not found")

# Update Mutation class


class Mutation(graphene.ObjectType):
    register = RegisterMutation.Field()
    login = LoginMutation.Field()
    google_login = GoogleLoginMutation.Field()
    upload_file = UploadFileMutation.Field()
    create_folder = CreateFolderMutation.Field()
    rename_file = RenameFileMutation.Field()
    delete_file = DeleteFileMutation.Field()
    rename_folder = RenameFolderMutation.Field()
    delete_folder = DeleteFolderMutation.Field()
    delete_file_forever = DeleteFileForeverMutation.Field()
    delete_folder_forever = DeleteFolderForeverMutation.Field()
    move_file = MoveFileMutation.Field()
    move_folder = MoveFolderMutation.Field()


schema = graphene.Schema(query=Query, mutation=Mutation)

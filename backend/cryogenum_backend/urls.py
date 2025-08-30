from django.contrib import admin
from django.urls import include, path
from django.views.decorators.csrf import csrf_exempt
# ✅ use upload-enabled view
from graphene_file_upload.django import FileUploadGraphQLView
from cryogenum_backend.schema import schema

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "graphql/",
        csrf_exempt(FileUploadGraphQLView.as_view(
            graphiql=True, schema=schema)),  # ✅ fixed
    ),
    path("accounts/", include("allauth.urls")),
]

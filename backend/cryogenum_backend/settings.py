"""
Django settings for cryogenum_backend project.
"""

from pathlib import Path
import os
import dj_database_url

# --------------------------------------
# BASE DIRECTORY
# --------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# --------------------------------------
# SECRET & DEBUG
# --------------------------------------
SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "7u#p5q6e@_pk@0q8w(&=$iirdy^rq%w3s9^ugw_!w%ke_7+_8$"
)
DEBUG = os.getenv("DJANGO_DEBUG", "True") == "True"

# --------------------------------------
# ALLOWED HOSTS
# --------------------------------------
ALLOWED_HOSTS = os.getenv(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1,localhost:5173,cryogena.vercel.app,cryogena-backend.onrender.com"
).split(",")

# --------------------------------------
# INSTALLED APPS
# --------------------------------------
INSTALLED_APPS = [
    # Django default
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "corsheaders",
    "graphene_django",

    # Local apps
    "accounts",
]

# --------------------------------------
# MIDDLEWARE
# --------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# --------------------------------------
# ROOT URL & TEMPLATES
# --------------------------------------
ROOT_URLCONF = "cryogenum_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "cryogenum_backend.wsgi.application"

# --------------------------------------
# DATABASE
# --------------------------------------
DATABASES = {
    "default": dj_database_url.parse(
        os.getenv(
            "DATABASE_URL",
            "postgresql://neondb_owner:npg_4DrMUeWydf0X@ep-restless-tooth-ad1j27vu-pooler.c-2.us-east-1.aws.neon.tech/cryogena-database?sslmode=require&channel_binding=require"
        ),
        conn_max_age=600,
        ssl_require=not DEBUG,
    )
}

# --------------------------------------
# AUTHENTICATION
# --------------------------------------
AUTH_USER_MODEL = "accounts.CustomUser"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTHENTICATION_BACKENDS = [
    "accounts.auth_backends.EmailBackend",
    "django.contrib.auth.backends.ModelBackend",
]

# --------------------------------------
# INTERNATIONALIZATION
# --------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --------------------------------------
# STATIC & MEDIA FILES
# --------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# --------------------------------------
# DEFAULT AUTO FIELD
# --------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------
# CSRF & CORS
# --------------------------------------
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "https://cryogena-backend.onrender.com",
    "https://cryogena.vercel.app/"
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://cryogena-backend.onrender.com",
    "https://cryogena.vercel.app/"
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "OPTIONS"]
CORS_ALLOW_HEADERS = ["Content-Type", "X-CSRFToken", "Cookie", "Authorization"]
CORS_EXPOSE_HEADERS = ["Set-Cookie"]

# --------------------------------------
# SESSION & COOKIE SETTINGS
# --------------------------------------
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = "Lax" if DEBUG else "None"
SECURE_SSL_REDIRECT = not DEBUG

# --------------------------------------
# GRAPHQL SETTINGS
# --------------------------------------
GRAPHENE = {
    "SCHEMA": "cryogenum_backend.schema.schema",
    "MIDDLEWARE": [],
}

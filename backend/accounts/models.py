from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    credits = models.IntegerField(default=100)
    avatar_initials = models.CharField(max_length=2, blank=True)
    tier = models.CharField(
        max_length=10,
        choices=[('free', 'Free'), ('pro', 'Pro')],
        default='free'
    )

    def save(self, *args, **kwargs):
        if not self.avatar_initials:
            self.avatar_initials = ''.join(
                word[0].upper() for word in self.username.split()[:2])
        super().save(*args, **kwargs)

    @property
    def storage_limit(self):
        if self.tier == 'pro':
            return 50 * 1024 * 1024 * 1024  # 50 GB in bytes
        return 1 * 1024 * 1024 * 1024  # 1 GB in bytes


class Folder(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)  # For bin


class File(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    folder = models.ForeignKey(
        Folder, null=True, blank=True, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    size = models.IntegerField(default=0)  # in bytes
    # e.g., 'image', 'pdf', 'doc', 'mp3', 'video'
    file_type = models.CharField(max_length=50)
    file = models.FileField(
        upload_to='uploads/%Y/%m/%d/', null=True, blank=True)
    is_deleted = models.BooleanField(default=False)  # For bin

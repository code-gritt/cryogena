from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    credits = models.IntegerField(default=100)
    avatar_initials = models.CharField(max_length=2, blank=True)

    def save(self, *args, **kwargs):
        if not self.avatar_initials:
            self.avatar_initials = ''.join(
                word[0].upper() for word in self.username.split()[:2]
            )
        super().save(*args, **kwargs)

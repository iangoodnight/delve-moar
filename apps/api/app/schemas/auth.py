"""Request and response schemas for authentication endpoints."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Self

from pydantic import EmailStr, Field

from app.schemas.base import AppSchema

if TYPE_CHECKING:
    from app.models import User


class SignupRequest(AppSchema):
    """Payload to create a new account."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(AppSchema):
    """Payload to authenticate with email and password."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(AppSchema):
    """Public representation of a user; never includes the password hash."""

    id: uuid.UUID
    email: EmailStr
    email_verified: bool
    created_at: datetime

    @classmethod
    def from_user(cls, user: "User") -> Self:
        """Build a response from a ``User`` ORM instance.

        Args:
            user: The user ORM object.

        Returns:
            A ``UserResponse`` whose ``email_verified`` is derived from
            ``email_verified_at``.
        """
        return cls(
            id=user.id,
            email=user.email,
            email_verified=user.email_verified_at is not None,
            created_at=user.created_at,
        )

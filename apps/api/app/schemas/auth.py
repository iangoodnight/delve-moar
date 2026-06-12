"""Request and response schemas for authentication endpoints."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Annotated, Self

from pydantic import AfterValidator, EmailStr, Field

from app.schemas.base import AppSchema

if TYPE_CHECKING:
    from app.models import User

# Public-handle rules (#185). Lowercase-only is deliberate: allowing mixed
# case would let ``Foo`` and ``foo`` impersonate each other. The pattern also
# bounds the charset to URL- and mention-safe characters.
USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 30
USERNAME_PATTERN = r"^[a-z0-9_-]+$"

# Names we never hand to a user because they read as official, are routing
# words, or collide with auth verbs. Kept deliberately small; grow as needed.
RESERVED_USERNAMES = frozenset(
    {
        "admin",
        "administrator",
        "root",
        "system",
        "moderator",
        "support",
        "help",
        "api",
        "me",
        "login",
        "logout",
        "signup",
        "settings",
        "delvemoar",
    }
)


def _reject_reserved_username(value: str) -> str:
    """Reject reserved handles after the charset/length checks pass.

    Args:
        value: A username already validated as lowercase ``[a-z0-9_-]``.

    Returns:
        The username unchanged when it is not reserved.

    Raises:
        ValueError: If the username is on the reserved denylist (-> 422).
    """
    if value in RESERVED_USERNAMES:
        msg = f"'{value}' is a reserved username."
        raise ValueError(msg)
    return value


Username = Annotated[
    str,
    Field(
        min_length=USERNAME_MIN_LENGTH,
        max_length=USERNAME_MAX_LENGTH,
        pattern=USERNAME_PATTERN,
        description=(
            "Public handle. Lowercase letters, digits, hyphen, and "
            "underscore only; 3-30 characters."
        ),
    ),
    AfterValidator(_reject_reserved_username),
]

# Shared password constraints for any endpoint that *sets* a password
# (signup, password reset). Login does not reuse this -- it accepts whatever
# was stored so older/shorter passwords still authenticate.
Password = Annotated[str, Field(min_length=8, max_length=128)]


class SignupRequest(AppSchema):
    """Payload to create a new account."""

    username: Username
    email: EmailStr
    password: Password


class LoginRequest(AppSchema):
    """Payload to authenticate with a username-or-email and password.

    ``identifier`` accepts either the account's username or its email; the
    presence of ``@`` disambiguates (usernames cannot contain ``@``).
    """

    identifier: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class VerifyEmailRequest(AppSchema):
    """Payload to confirm an email address with a verification token."""

    token: str = Field(min_length=1)


class PasswordResetRequest(AppSchema):
    """Payload to request a password-reset email.

    ``identifier`` is the account's username or email (same matching as
    login). The response is identical whether or not an account matches, so
    it never reveals which addresses are registered.
    """

    identifier: str = Field(min_length=1, max_length=255)


class PasswordResetConfirmRequest(AppSchema):
    """Payload to set a new password using a reset token."""

    token: str = Field(min_length=1)
    password: Password


class MessageResponse(AppSchema):
    """A generic, non-revealing acknowledgement message."""

    message: str


class UserResponse(AppSchema):
    """The owner's own view of their account.

    Returned only to the authenticated account holder (signup, login,
    ``/me``). ``email`` appears here and nowhere else; other users see the
    ``Author`` projection instead.
    """

    id: uuid.UUID
    username: str
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
            username=user.username,
            email=user.email,
            email_verified=user.email_verified_at is not None,
            created_at=user.created_at,
        )


class Author(AppSchema):
    """Public author projection -- how a user is shown to *other* users.

    The only user data exposed when homebrew is published (#185, consumed by
    #177+). Deliberately carries ``username`` alone: it is a unique,
    immutable, stable public handle in Phase 1b, so neither the private
    email nor the internal user id ever needs to leave the owner's own view.
    Adding fields later (e.g. a stable public id, should usernames ever
    become mutable) is an additive, non-breaking change.
    """

    username: str

    @classmethod
    def from_user(cls, user: "User") -> Self:
        """Build the public projection from a ``User`` ORM instance.

        Args:
            user: The user ORM object.

        Returns:
            An ``Author`` carrying only the public handle.
        """
        return cls(username=user.username)

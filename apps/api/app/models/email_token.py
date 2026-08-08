"""Email-token ORM model: single-use verification and reset tokens."""

import uuid
from datetime import datetime
from enum import StrEnum

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EmailTokenPurpose(StrEnum):
    """What an email token authorizes.

    The string values are stored verbatim in ``email_tokens.purpose`` (a
    plain ``String`` column rather than a Postgres enum, so adding a purpose
    later needs no type migration).
    """

    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"  # noqa: S105 (purpose label, not a secret)
    EMAIL_CHANGE = "email_change"


class EmailToken(Base):
    """A single-use, expiring token delivered to a user by email.

    Backs both email verification and password reset (#171). Like sessions,
    the raw token is only ever held by the recipient; only its SHA-256 hex
    digest lives in ``token_hash``. A token is single-use: it is deleted the
    moment it is consumed, so a consumed token and one that never existed are
    indistinguishable on lookup. The ``user_id`` foreign key cascades on
    delete.
    """

    __tablename__ = "email_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(sa.String(64), unique=True)
    purpose: Mapped[str] = mapped_column(sa.String(32))
    expires_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )

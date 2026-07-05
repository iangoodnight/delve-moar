"""Session ORM model."""

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Session(Base):
    """A server-side login session for a user.

    The opaque session token is never stored; only its SHA-256 hex digest
    lives in ``token_hash``, which is looked up on each authenticated
    request. Sessions carry a sliding ``expires_at``; deleting rows revokes
    them, and "sign out everywhere" deletes every row for a user. The
    ``user_id`` foreign key cascades on delete.
    """

    __tablename__ = "sessions"

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
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )
    expires_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
    )
    last_used_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )

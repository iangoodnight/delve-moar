"""User ORM model."""

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    """A registered account -- owns homebrew content and campaigns.

    ``username`` is the account's public identity (the handle shown when
    homebrew is published, see #185): lowercase, globally unique, and the
    only user field ever exposed to other users. ``email`` is private --
    stored normalized to lowercase, globally unique, and only ever returned
    in the owner's own ``/me`` view. ``password_hash`` holds an argon2id
    encoded hash and is never serialized to API responses.
    ``email_verified_at`` is set once a user completes email verification
    (#171); the auth core does not yet gate login on it.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )
    username: Mapped[str] = mapped_column(sa.String(30), unique=True)
    email: Mapped[str] = mapped_column(sa.String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(sa.String(255))
    email_verified_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True),
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )

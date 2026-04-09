"""Spell ORM model."""

import uuid
from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Spell(Base):
    """A spell entry — SRD spells or user homebrew.

    ``level`` is stored as an integer (0 = cantrip). Display strings
    ("cantrip", "1st", "2nd", …) are produced at the API layer.
    """

    __tablename__ = "spells"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )
    slug: Mapped[str] = mapped_column(sa.String(255))
    # Composite UNIQUE(slug, source_namespace) enforced at DB level.
    # "srd-5.1" | "srd-2024" | "user:{user_id}"
    source_namespace: Mapped[str] = mapped_column(sa.String(50))
    name: Mapped[str] = mapped_column(sa.String(255))
    level: Mapped[int | None] = mapped_column(sa.SmallInteger())
    school: Mapped[str | None] = mapped_column(sa.String(100))
    content: Mapped[dict[str, Any]] = mapped_column(JSONB)
    content_source: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )

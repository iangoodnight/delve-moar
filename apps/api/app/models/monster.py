"""Monster ORM model."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Monster(Base):
    """A creature entry — SRD monsters or user homebrew.

    Filterable fields (monster_type, challenge_rating) are promoted to
    dedicated columns. The full source payload is preserved in ``content``
    for passthrough to API consumers without lossy transformation.
    """

    __tablename__ = "monsters"

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
    monster_type: Mapped[str | None] = mapped_column(sa.String(100))
    # Stored as NUMERIC: "1/4" → 0.250, "1/2" → 0.500, "30" → 30.000
    # Display formatting (0.25 → "1/4") is handled at the API layer.
    challenge_rating: Mapped[Decimal | None] = mapped_column(sa.Numeric(6, 3))
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

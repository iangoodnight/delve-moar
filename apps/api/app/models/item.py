"""Item ORM model."""

import uuid
from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Item(Base):
    """An item entry — SRD equipment, magic items, or user homebrew.

    Mundane equipment and magic items share this table, distinguished by
    ``item_category``. Magic items carry a ``rarity`` value; mundane items
    leave it NULL.
    """

    __tablename__ = "items"

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
    item_category: Mapped[str | None] = mapped_column(sa.String(100))
    rarity: Mapped[str | None] = mapped_column(sa.String(50))
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

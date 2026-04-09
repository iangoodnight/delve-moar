"""Campaign ORM model."""

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Campaign(Base):
    """A game campaign — the multi-tenancy anchor for all campaign-scoped content."""

    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(sa.String(255))
    slug: Mapped[str] = mapped_column(sa.String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )

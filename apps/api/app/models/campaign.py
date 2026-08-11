"""Campaign ORM models -- campaigns, membership, and enabled books.

A campaign is an owner-controlled container that shares content with its
members by *enabling books* on it (ADR 0011, ADR 0014). Ownership lives on
``campaigns.owner_id`` (owner-only writes); ``campaign_members`` are the
invited readers; ``campaign_books`` are the books whose contents those
members may read.
"""

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Campaign(Base):
    """A game campaign owned by a DM, sharing enabled books with members.

    ``owner_id`` is the controlling user (owner-only writes in Phase 1b).
    ``slug`` is nullable -- campaigns are addressed by id, like user books,
    and a globally unique slug would collide across users. Members reach the
    campaign's content only through its enabled books (``campaign_books``).
    """

    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(sa.String(255))
    slug: Mapped[str | None] = mapped_column(sa.String(255), unique=True)
    description: Mapped[str | None] = mapped_column(sa.Text())
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
        onupdate=sa.text("NOW()"),
    )


class CampaignMember(Base):
    """A user's membership in a campaign: read access to its enabled books.

    The owner is not stored here (ownership is ``campaigns.owner_id``); these
    rows are the invited readers. The invite flow that populates them lands
    in a follow-up; the authz read rule already reads from this table.
    """

    __tablename__ = "campaign_members"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("campaigns.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )


class CampaignBook(Base):
    """A book enabled on a campaign; grants members read access (ADR 0014)."""

    __tablename__ = "campaign_books"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("campaigns.id", ondelete="CASCADE"),
        primary_key=True,
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("books.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )

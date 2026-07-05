"""Book ORM models -- content collections (ADR 0014).

A book is an owned collection of content. Content associates to books
many-to-many through one join model per resource. The SRD catalog is a
system book (``is_system``, ``is_public``, ``owner_id`` NULL); user books
are private and owner-scoped.
"""

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Book(Base):
    """A named collection of content owned by a user, or a system book.

    ``owner_id`` is NULL for system books (the SRD catalog); user books
    carry their owner. ``slug`` is a stable handle for system books and
    NULL for user books, so user books never collide on it. ``is_system``
    books are read-only; ``is_public`` books are readable by anyone.
    """

    __tablename__ = "books"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(sa.String(255))
    slug: Mapped[str | None] = mapped_column(sa.String(255), unique=True)
    description: Mapped[str | None] = mapped_column(sa.Text())
    is_public: Mapped[bool] = mapped_column(
        sa.Boolean(),
        server_default=sa.false(),
    )
    is_system: Mapped[bool] = mapped_column(
        sa.Boolean(),
        server_default=sa.false(),
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
        onupdate=sa.text("NOW()"),
    )


class BookMonster(Base):
    """Membership of a monster in a book."""

    __tablename__ = "book_monsters"

    book_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("books.id", ondelete="CASCADE"),
        primary_key=True,
    )
    monster_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("monsters.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )


class BookSpell(Base):
    """Membership of a spell in a book."""

    __tablename__ = "book_spells"

    book_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("books.id", ondelete="CASCADE"),
        primary_key=True,
    )
    spell_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("spells.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )


class BookItem(Base):
    """Membership of an item in a book."""

    __tablename__ = "book_items"

    book_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("books.id", ondelete="CASCADE"),
        primary_key=True,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(native_uuid=True),
        sa.ForeignKey("items.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        server_default=sa.text("NOW()"),
    )

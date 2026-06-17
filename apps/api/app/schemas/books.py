"""Books schemas -- content collections (ADR 0014)."""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.auth import Author
from app.schemas.base import AppSchema


class BookCreate(AppSchema):
    """Payload to create a book."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class BookUpdate(AppSchema):
    """Payload to update a book. Only the provided fields are changed."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class BookSummary(AppSchema):
    """A book as shown in list views.

    ``owner`` is the public author projection (username only) for a
    user-owned book, or null for a system book such as the SRD catalog.
    ``isSystem`` books are read-only; ``isPublic`` books are readable by
    anyone.
    """

    id: uuid.UUID
    name: str
    slug: str | None
    description: str | None
    is_public: bool
    is_system: bool
    owner: Author | None
    created_at: datetime
    updated_at: datetime


class BookDetail(BookSummary):
    """A single book with the count of content it holds, by resource type."""

    monster_count: int
    spell_count: int
    item_count: int

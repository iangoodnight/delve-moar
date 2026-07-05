"""Books schemas -- content collections (ADR 0014)."""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.auth import Author
from app.schemas.base import AppSchema


class BookCreate(AppSchema):
    """Payload to create a book."""

    name: str = Field(
        min_length=1, max_length=255, description="Display name for the book."
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="Optional longer description of the book.",
    )


class BookUpdate(AppSchema):
    """Payload to update a book. Only the provided fields are changed."""

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="New display name for the book.",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="New description for the book.",
    )


class BookSummary(AppSchema):
    """A book as shown in list views."""

    id: uuid.UUID = Field(description="Unique identifier for the book.")
    name: str = Field(description="Display name of the book.")
    slug: str | None = Field(
        description="Stable handle for system books; null for user books."
    )
    description: str | None = Field(description="Longer description, if any.")
    is_public: bool = Field(
        description="Whether the book is readable by anyone."
    )
    is_system: bool = Field(
        description="Whether this is a read-only system book (e.g. the SRD)."
    )
    owner: Author | None = Field(
        description="Public author projection, or null for a system book."
    )
    created_at: datetime = Field(description="When the book was created.")
    updated_at: datetime = Field(description="When the book was last updated.")


class BookDetail(BookSummary):
    """A single book with the count of content it holds, by resource type."""

    monster_count: int = Field(description="Number of monsters in the book.")
    spell_count: int = Field(description="Number of spells in the book.")
    item_count: int = Field(description="Number of items in the book.")

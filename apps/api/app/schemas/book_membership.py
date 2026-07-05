"""Book-membership projection nested in content responses (ADR 0014).

Lives in its own module so the content schemas (monsters/spells/items) can
embed it without importing ``app.schemas.books`` -- which already imports the
content summaries, and would form a cycle.
"""

import uuid

from pydantic import Field

from app.schemas.base import AppSchema


class BookMembership(AppSchema):
    """A book owned by the requesting user that contains this content."""

    id: uuid.UUID = Field(description="Unique identifier for the book.")
    name: str = Field(description="Display name of the book.")
    slug: str | None = Field(
        description="Stable handle for system books; null for user books."
    )

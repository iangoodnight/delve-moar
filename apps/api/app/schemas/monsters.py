"""Monsters schemas."""

from typing import Any

from pydantic import field_validator

from app.schemas.base import AppSchema
from app.utils import cr_display


class MonsterSummary(AppSchema):
    """Summary info for a monster, used in list endpoints.

    Attributes:
        slug: Unique identifier for the monster, used in URLs.
        name: The monster's name.
        monster_type: The type or category of the monster (e.g. "Dragon").
        challenge_rating: The monster's challenge rating as a display string
            (e.g. "1/2", "5", "10").
    """

    slug: str
    name: str
    monster_type: str | None
    challenge_rating: str  # display str, not the raw decimal

    @field_validator("challenge_rating", mode="before")
    @classmethod
    def format_cr(cls, value: Any) -> str:
        """Format the challenge rating as a display string."""
        if value is None:
            return "Unknown"
        return cr_display(float(value))


class MonsterDetail(MonsterSummary):
    """Full monster details, used in detail endpoints.

    Attributes:
        content: The full monster data as ingested from the source, with all
            original fields and structure preserved.
        content_source: Metadata about the source of the monster data, such as
            the original URL or source file name.
    """

    content: dict[str, Any]
    content_source: dict[str, Any]

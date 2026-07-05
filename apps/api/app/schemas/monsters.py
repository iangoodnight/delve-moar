"""Monsters schemas."""

import uuid
from typing import Any

from pydantic import Field, field_validator

from app.display import cr_display
from app.schemas.base import AppSchema
from app.schemas.book_membership import BookMembership
from app.schemas.content_source import ContentSource
from app.schemas.monster_content import SrdMonsterContent


class MonsterSummary(AppSchema):
    """Summary info for a monster, used in list endpoints."""

    id: uuid.UUID = Field(description="Unique identifier for the monster.")
    slug: str = Field(description="URL-safe unique identifier.")
    name: str = Field(description="The monster's name.")
    monster_type: str | None = Field(
        description="Type or category (e.g. 'dragon')."
    )
    challenge_rating: str = Field(
        description="Challenge rating as a display string (e.g. '1/2', '5')."
    )
    book_memberships: list[BookMembership] | None = Field(
        default=None,
        description=(
            "The signed-in user's own books that contain this entry. Present "
            "only when requested via include=book_memberships; omitted for "
            "anonymous requests."
        ),
    )

    @field_validator("challenge_rating", mode="before")
    @classmethod
    def format_cr(cls, value: Any) -> str:
        """Format the challenge rating as a display string."""
        if value is None:
            return "Unknown"
        return cr_display(float(value))


class MonsterDetail(MonsterSummary):
    """Full monster details, used in detail endpoints."""

    content: SrdMonsterContent = Field(
        description="Full source payload, with all original fields preserved."
    )
    content_source: ContentSource = Field(
        description="Provenance and licensing metadata for the entry."
    )

"""Spell schemas for list and detail endpoints."""

from typing import Any

from pydantic import Field, field_validator

from app.schemas.base import AppSchema
from app.schemas.content_source import ContentSource
from app.schemas.spell_content import SrdSpellContent


class SpellSummary(AppSchema):
    """Summary info for a spell, used in list endpoints."""

    slug: str = Field(description="URL-safe unique identifier.")
    name: str = Field(description="The spell's name.")
    level: str = Field(
        description="Level as a display string (e.g. 'Cantrip', '1st')."
    )
    school: str | None = Field(
        description="School of magic (e.g. 'evocation')."
    )

    @field_validator("level", mode="before")
    @classmethod
    def format_level(cls, value: Any) -> str:
        """Format the raw integer spell level as a display string.

        Args:
            value: The raw level value from the ORM row (int or None).

        Returns:
            A user-friendly string: "Cantrip" for level 0, ordinal strings
            ("1st", "2nd", "3rd", "4th" ...) for levels 1-9, and "Unknown"
            when the value is None.

        Raises:
            ValueError: If the value is not an int or None.
        """
        match value:
            case 0:
                return "Cantrip"
            case int() as n if n > 0:
                suffix = "th"
                if n % 10 == 1 and n % 100 != 11:
                    suffix = "st"
                elif n % 10 == 2 and n % 100 != 12:
                    suffix = "nd"
                elif n % 10 == 3 and n % 100 != 13:
                    suffix = "rd"
                return f"{n}{suffix}"
            case None:
                return "Unknown"
            case _:
                raise ValueError(f"Invalid spell level: {value!r}")


class SpellDetail(SpellSummary):
    """Full spell details, used in the detail endpoint."""

    content: SrdSpellContent = Field(
        description="Full source payload, with all original fields preserved."
    )
    content_source: ContentSource = Field(
        description="Provenance and licensing metadata for the entry."
    )

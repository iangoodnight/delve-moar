"""Item schemas for list and detail endpoints."""

from pydantic import Field

from app.schemas.base import AppSchema
from app.schemas.book_membership import BookMembership
from app.schemas.content_source import ContentSource
from app.schemas.item_content import SrdItemContent


class ItemSummary(AppSchema):
    """Summary info for an item, used in list endpoints."""

    slug: str = Field(description="URL-safe unique identifier.")
    name: str = Field(description="The item's name.")
    item_category: str | None = Field(
        description="Category (e.g. 'weapon', 'potion'), if available."
    )
    rarity: str | None = Field(
        description="Rarity (e.g. 'rare'); null for mundane items."
    )
    book_memberships: list[BookMembership] | None = Field(
        default=None,
        description=(
            "The signed-in user's own books that contain this entry. Present "
            "only when requested via include=book_memberships; omitted for "
            "anonymous requests."
        ),
    )


class ItemDetail(ItemSummary):
    """Full item details, used in detail endpoints."""

    content: SrdItemContent = Field(
        description="Full source payload, with all original fields preserved."
    )
    content_source: ContentSource = Field(
        description="Provenance and licensing metadata for the entry."
    )

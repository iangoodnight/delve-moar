"""Item schemas for list and detail endpoints."""

from typing import Any

from app.schemas.base import AppSchema
from app.schemas.content_source import ContentSource


class ItemSummary(AppSchema):
    """Summary info for an item, used in list endpoints.

    Attributes:
        slug: Unique identifier for the item, used in URLs.
        name: The item's name.
        item_category: The category of the item (e.g. "Weapon", "Potion"),
            if available. This is not guaranteed to be present for all items, as
            it depends on the source data.
        rarity: The rarity of the item (e.g. "Common", "Rare"), if available.
    """

    slug: str
    name: str
    item_category: str | None
    rarity: str | None


class ItemDetail(ItemSummary):
    """Full item details, used in detail endpoints.

    Attributes:
        content: The full item data as ingested from the source, with all
            original fields and structure preserved.
        content_source: Metadata about the source of the item data, such as
            the original URL or source file name.
    """

    content: dict[str, Any]
    content_source: ContentSource

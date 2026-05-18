"""Shared SRD reference link model.

`SrdReference` is the `{ index, name, url? }` link shape that appears all
over the SRD payloads — weapon properties, damage types, monster
condition immunities, monster proficiencies, etc. Lifted to a shared
module so item-content and monster-content (and any future content
module) can reuse one class. Avoids two separate `Reference` classes
colliding in OpenAPI's component schemas.
"""

from app.schemas.content_base import ContentBase


class SrdReference(ContentBase):
    """An SRD reference link."""

    index: str
    name: str
    url: str | None = None

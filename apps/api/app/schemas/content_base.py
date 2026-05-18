"""Base class for SRD content payload models.

Lives alongside `app.schemas.base.AppSchema` but serves a different purpose:
AppSchema is the base for top-level response models, while ContentBase is the
base for the SRD content payload models that get nested inside those
responses (the `content` and `contentSource` fields on monsters, spells, and
items).

ContentBase carries the same camelCase JSON serialization as AppSchema (so
the wire shape stays consistent), and adds `extra='allow'` so unknown SRD
fields pass through on intake. Typed fields are strict; unknown fields are
preserved but not type-narrowed for consumers.

Pydantic 2 replaces `model_config` on subclasses rather than merging, so the
camelCase + populate-by-name + from-attributes settings are re-declared here
explicitly rather than inherited from AppSchema's `model_config`.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ContentBase(BaseModel):
    """Base config for SRD content payload models."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="allow",
    )

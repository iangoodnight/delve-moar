"""Pydantic model for the SRD `contentSource` payload.

Shared by every resource (monsters, spells, items): the seed pipeline writes
the same SRD_CONTENT_SOURCE constant to the `content_source` JSONB column,
and detail responses surface it as the attribution footer for the FE.

Typed fields are strict; `extra='allow'` (via ContentBase) preserves any
future seed pipeline additions on intake without rejecting the row.
"""

from app.schemas.content_base import ContentBase


class ContentSource(ContentBase):
    """SRD content source attribution.

    Attributes:
        type: Identifier for the kind of source (e.g. "srd").
        license: Human-readable license name (e.g. "CC BY 4.0").
        license_url: URL to the license text.
        attribution: Required attribution string per the license.
        data_provider: Origin of the seed data (e.g. "5e-bits/5e-database").
        data_provider_url: URL to the data provider's source repo.
    """

    type: str
    license: str
    license_url: str
    attribution: str
    data_provider: str
    data_provider_url: str

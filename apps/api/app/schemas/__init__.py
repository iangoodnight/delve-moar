"""Public schema registry.

Importing this package makes all response and error schemas available from a
single location, and registers them with FastAPI's OpenAPI schema generator.
"""

from app.schemas.base import AppSchema
from app.schemas.errors import ErrorResponse
from app.schemas.monsters import MonsterDetail, MonsterSummary
from app.schemas.pagination import (
    MetadataEnvelope,
    PaginatedResultset,
    ResultsetMeta,
)
from app.schemas.spells import SpellDetail, SpellSummary

__all__ = [
    "AppSchema",
    "ErrorResponse",
    "MetadataEnvelope",
    "MonsterDetail",
    "MonsterSummary",
    "PaginatedResultset",
    "ResultsetMeta",
    "SpellDetail",
    "SpellSummary",
]

"""Pagination envelope schemas following White House API standards."""

from typing import Generic, TypeVar

from app.schemas.base import AppSchema

T = TypeVar("T")


class ResultsetMeta(AppSchema):
    """Metadata about a paginated resultset."""

    count: int  # total matching records (not just this page)
    offset: int  # offset of this page
    limit: int  # number of records in this page


class MetadataEnvelope(AppSchema):
    """Envelopes a paginated resultset with metadata."""

    resultset: ResultsetMeta


class PaginatedResultset(AppSchema, Generic[T]):
    """A paginated resultset with metadata."""

    metadata: MetadataEnvelope
    data: list[T]

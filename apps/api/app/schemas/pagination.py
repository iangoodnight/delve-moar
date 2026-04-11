"""Pagination envelope schemas following White House API standards."""

from typing import Generic, TypeVar

from app.schemas.base import AppSchema

T = TypeVar("T")


class ResultsetMeta(AppSchema):
    """Metadata about a paginated resultset."""

    count: int  # total matching records (not just this page)
    offset: int  # offset of this page
    limit: int  # number of records in this page


class Links(AppSchema):
    """Prev/next navigation links for a paginated resultset.

    Attributes:
        prev: Absolute URL for the previous page, or null on the first page.
        next: Absolute URL for the next page, or null on the last page.
    """

    prev: str | None
    next: str | None


class MetadataEnvelope(AppSchema):
    """Envelopes a paginated resultset with metadata."""

    resultset: ResultsetMeta
    links: Links


class PaginatedResultset(AppSchema, Generic[T]):
    """A paginated resultset with metadata."""

    metadata: MetadataEnvelope
    data: list[T]

"""Pagination envelope schemas following White House API standards."""

from typing import Generic, TypeVar

from pydantic import Field

from app.schemas.base import AppSchema

T = TypeVar("T")


class ResultsetMeta(AppSchema):
    """Metadata about a paginated resultset."""

    count: int = Field(
        description="Total records matching the query, across all pages."
    )
    offset: int = Field(description="Offset of this page.")
    limit: int = Field(description="Number of records in this page.")


class Links(AppSchema):
    """Prev/next navigation links for a paginated resultset."""

    prev: str | None = Field(
        description="URL of the previous page, or null on the first page."
    )
    next: str | None = Field(
        description="URL of the next page, or null on the last page."
    )


class MetadataEnvelope(AppSchema):
    """Envelopes a paginated resultset with metadata."""

    resultset: ResultsetMeta = Field(description="Pagination counters.")
    links: Links = Field(description="Prev/next navigation links.")


class PaginatedResultset(AppSchema, Generic[T]):
    """A paginated resultset with metadata."""

    metadata: MetadataEnvelope = Field(
        description="Pagination metadata and links."
    )
    data: list[T] = Field(description="The records on this page.")

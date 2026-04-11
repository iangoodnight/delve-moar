"""Utility functions for the application."""

from collections.abc import Sequence
from typing import Any
from urllib.parse import urlencode

from fastapi import Request
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import PaginationParams
from app.display import cr_display
from app.schemas.pagination import (
    Links,
    MetadataEnvelope,
    PaginatedResultset,
    ResultsetMeta,
)

# Re-export so callers that use `from app.utils import cr_display` keep working.
__all__ = ["cr_display"]


def build_links(
    request: Request,
    count: int,
    offset: int,
    limit: int,
) -> Links:
    """Build prev/next pagination links for a list endpoint response.

    Constructs absolute URLs by combining ``settings.public_url`` with the
    request path and all existing query parameters. Only ``offset`` is
    replaced; all other parameters (filters, search, limit, etc.) are
    preserved unchanged.

    Args:
        request: The current HTTP request, used to read the path and query
            parameters.
        count: Total number of records matching the current filters (across
            all pages).
        offset: The offset of the current page.
        limit: The page size of the current page.

    Returns:
        A ``Links`` instance. ``prev`` is null when ``offset == 0``.
        ``next`` is null when ``offset + limit >= count``.

    Example:
        total, rows = await fetch_page(session, stmt, ordering, params)
        links = build_links(
            request, count=total, offset=params.offset, limit=params.limit
        )
    """
    base = f"{settings.public_url}{request.url.path}"
    params = dict(request.query_params)

    prev_url: str | None = None
    if offset > 0:
        prev_offset = max(0, offset - limit)
        prev_url = f"{base}?{urlencode({**params, 'offset': prev_offset})}"

    next_url: str | None = None
    if offset + limit < count:
        next_url = f"{base}?{urlencode({**params, 'offset': offset + limit})}"

    return Links(prev=prev_url, next=next_url)


async def fetch_page(
    session: AsyncSession,
    stmt: Select[Any],
    ordering: Sequence[Any],
    params: PaginationParams,
) -> tuple[int, list[Any]]:
    """Run a count query then a paged data query for a list endpoint.

    Centralises the two-query pattern shared by every resource router: first
    count all rows matching the filtered ``stmt``, then apply ordering,
    offset, and limit before fetching the page.

    Args:
        session: Active async database session.
        stmt: A filtered ``SELECT`` statement (no ordering or paging applied
            yet).  Used as-is for the count, then extended for the data fetch.
        ordering: SQLAlchemy ordering expressions passed to ``order_by``.
        params: Pagination parameters (limit and offset) from the request.

    Returns:
        A ``(total, rows)`` tuple where ``total`` is the count across all
        pages and ``rows`` is the list of ORM instances for this page.

    Example:
        total, rows = await fetch_page(
            session, stmt,
            ordering=[Monster.challenge_rating.asc().nulls_last(),
                      Monster.name.asc()],
            params=params,
        )
    """
    total = (
        await session.scalar(select(func.count()).select_from(stmt.subquery()))
    ) or 0
    paged = stmt.order_by(*ordering).offset(params.offset).limit(params.limit)
    rows = list((await session.execute(paged)).scalars())
    return total, rows


def paginate[T](
    data: list[T],
    total: int,
    params: PaginationParams,
    links: Links,
) -> PaginatedResultset[T]:
    """Wrap a page of schema objects in the standard response envelope.

    Builds the ``PaginatedResultset`` that every list endpoint returns, keeping
    the boilerplate out of individual routers.  The caller is responsible for
    converting ORM rows to schema objects before passing ``data``.

    Args:
        data: A list of already-validated schema instances for the current page.
        total: Total number of records matching the query (across all pages).
        params: Pagination parameters (limit and offset) from the request.
        links: Prev/next navigation links built by ``build_links``.

    Returns:
        A ``PaginatedResultset`` with a ``metadata`` envelope and the ``data``
        list.

    Example:
        total, rows = await fetch_page(session, stmt, ordering, params)
        links = build_links(request, total, params.offset, params.limit)
        return paginate(
            data=[MonsterSummary.model_validate(r) for r in rows],
            total=total,
            params=params,
            links=links,
        )
    """
    return PaginatedResultset(
        metadata=MetadataEnvelope(
            resultset=ResultsetMeta(
                count=total,
                limit=params.limit,
                offset=params.offset,
            ),
            links=links,
        ),
        data=data,
    )

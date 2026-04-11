"""Utility functions for the application."""

from collections.abc import Sequence
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import PaginationParams
from app.schemas.pagination import (
    MetadataEnvelope,
    PaginatedResultset,
    ResultsetMeta,
)

_CR_DISPLAY: dict[Decimal, str] = {
    Decimal("0.125"): "1/8",
    Decimal("0.25"): "1/4",
    Decimal("0.5"): "1/2",
}


def cr_display(value: float | int) -> str:
    """Convert a numeric CR value to a human-friendly display string.

    Uses fractional notation for common fractional CRs (1/8, 1/4, 1/2) and
    otherwise displays the numeric value directly. This is intended for display
    purposes only (e.g., in progress output) and does not affect how CR values
    are stored.

    Args:
        value: The numeric CR value to convert.

    Returns:
        A string representation of the CR, using fractional notation for 1/8,
        1/4, and 1/2 where appropriate.

    Note:
        This function is intended for display purposes only (e.g., in progress
        output) and does not affect how CR values are stored in the database.

    Usage:
        print(f"CR: {cr_display(0.125)}")  # Output: CR: 1/8
        print(f"CR: {cr_display(0.25)}")   # Output: CR: 1/4
        print(f"CR: {cr_display(0.5)}")    # Output: CR: 1/2
        print(f"CR: {cr_display(1)}")      # Output: CR: 1
        print(f"CR: {cr_display(2.5)}")    # Output: CR: 2.5
    """
    d = Decimal(str(value)).quantize(Decimal("0.001"))
    return _CR_DISPLAY.get(d, str(int(value) if value == int(value) else value))


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
) -> PaginatedResultset[T]:
    """Wrap a page of schema objects in the standard response envelope.

    Builds the ``PaginatedResultset`` that every list endpoint returns, keeping
    the boilerplate out of individual routers.  The caller is responsible for
    converting ORM rows to schema objects before passing ``data``.

    Args:
        data: A list of already-validated schema instances for the current page.
        total: Total number of records matching the query (across all pages).
        params: Pagination parameters (limit and offset) from the request.

    Returns:
        A ``PaginatedResultset`` with a ``metadata`` envelope and the ``data``
        list.

    Example:
        rows = list((await session.execute(stmt)).scalars())
        return paginate(
            data=[MonsterSummary.model_validate(r) for r in rows],
            total=total,
            params=params,
        )
    """
    return PaginatedResultset(
        metadata=MetadataEnvelope(
            resultset=ResultsetMeta(
                count=total,
                limit=params.limit,
                offset=params.offset,
            )
        ),
        data=data,
    )

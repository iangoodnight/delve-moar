"""Reusable FastAPI dependencies shared across resource routers."""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Query


@dataclass
class PaginationParams:
    """Parsed pagination parameters extracted from request query string."""

    limit: int
    offset: int


def _pagination(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginationParams:
    """Extract and validate pagination query parameters.

    Args:
        limit: Maximum number of results to return. Range 1-100, default 20.
        offset: Number of results to skip. Default 0.

    Returns:
        PaginationParams dataclass with validated limit and offset.
    """
    return PaginationParams(limit=limit, offset=offset)


Pagination = Annotated[PaginationParams, Depends(_pagination)]

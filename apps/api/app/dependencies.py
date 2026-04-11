"""Reusable FastAPI dependencies shared across resource routers."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, Query, status
from sqlalchemy.orm import InstrumentedAttribute

from app.config import settings


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


def ordering_dep(
    columns: dict[str, InstrumentedAttribute[Any]],
    default: str = "name:asc",
) -> Callable[..., list[Any]]:
    """Return a FastAPI dependency that parses and validates order_by.

    The returned dependency accepts an optional ``order_by`` query parameter
    containing a comma-separated list of ``column:direction`` pairs and
    returns a list of SQLAlchemy ordering expressions ready to pass to
    ``fetch_page``.

    Null handling: ``asc`` columns use ``NULLS LAST``; ``desc`` columns use
    ``NULLS FIRST`` -- matching PostgreSQL convention for consistent ordering
    of nullable columns.

    Args:
        columns: Mapping of client-facing column name to ORM attribute.
            Only names present in this dict are accepted in the query param.
        default: Ordering spec used when ``order_by`` is omitted. Uses the
            same ``column:direction`` syntax as the query parameter.

    Returns:
        A FastAPI dependency function that injects an ``order_by`` query
        parameter and returns a list of SQLAlchemy ordering expressions.

    Example:
        _MONSTER_ORDERING = ordering_dep(
            {
                "name": Monster.name,
                "challenge_rating": Monster.challenge_rating,
            },
            default="challenge_rating:asc,name:asc",
        )
        MonsterOrdering = Annotated[list[Any], Depends(_MONSTER_ORDERING)]
    """
    valid = set(columns)
    col_list = ", ".join(sorted(valid))

    def _dep(
        order_by: Annotated[
            str | None,
            Query(
                description=(
                    "Comma-separated sort fields in column:direction format. "
                    "Direction is 'asc' or 'desc' (case-insensitive); "
                    "omitting direction defaults to 'asc'. "
                    f"Valid columns: {col_list}."
                ),
            ),
        ] = None,
    ) -> list[Any]:
        """Parse order_by and return SQLAlchemy ordering expressions.

        Args:
            order_by: Optional comma-separated ordering spec, e.g.
                ``'name:asc,level:desc'``. Falls back to the factory
                default when absent.

        Returns:
            A list of SQLAlchemy ``UnaryExpression`` objects, one per
            column token in the ordering spec.

        Raises:
            AppError: With status 422 if an unknown column name or an
                unrecognised direction value is encountered.
        """
        raw = order_by or default
        expressions: list[Any] = []

        for token in (t.strip() for t in raw.split(",")):
            if not token:
                continue

            col_name, _, direction = token.partition(":")
            col_name = col_name.strip()
            direction = direction.strip().lower() if direction else "asc"

            if col_name not in columns:
                # Lazy import breaks the circular dependency chain:
                # dependencies -> exceptions -> schemas -> utils -> dependencies
                from app.exceptions import AppError

                raise AppError(
                    status=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    error_code="VALIDATION_ERROR",
                    developer_message=(
                        f"Invalid order_by column '{col_name}'. "
                        f"Valid columns: {col_list}."
                    ),
                    user_message="Invalid sort field.",
                    more_info=f"{settings.public_url}/docs",
                )

            if direction not in ("asc", "desc"):
                from app.exceptions import AppError

                raise AppError(
                    status=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    error_code="VALIDATION_ERROR",
                    developer_message=(
                        f"Invalid order_by direction '{direction}'. "
                        "Use 'asc' or 'desc'."
                    ),
                    user_message="Invalid sort direction.",
                    more_info=f"{settings.public_url}/docs",
                )

            col = columns[col_name]
            if direction == "asc":
                expressions.append(col.asc().nulls_last())
            else:
                expressions.append(col.desc().nulls_first())

        return expressions

    return _dep

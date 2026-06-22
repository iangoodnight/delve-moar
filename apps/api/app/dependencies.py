"""Reusable FastAPI dependencies shared across resource routers."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, Query, status
from sqlalchemy import case, or_
from sqlalchemy.orm import InstrumentedAttribute

from app.config import settings


@dataclass
class SearchFilter:
    """Parsed search query: a WHERE clause and a relevance ordering expression.

    Produced by ``search_dep`` and consumed by list route handlers.

    Attributes:
        where: SQLAlchemy filter expression (OR across all searchable columns),
            or ``None`` when the search term is absent or blank.
        order_priority: List containing a single CASE expression that ranks
            rows by which column matched first. Prepend to the client-requested
            ordering so name matches sort above type matches, etc. Empty when
            search is absent.
    """

    where: Any
    order_priority: list[Any]


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

# Optional response expansions requested via ``?include=a,b``. Each route
# decides which keys it honours; unknown keys are ignored.
INCLUDE_BOOK_MEMBERSHIPS = "book_memberships"


def _include(
    include: Annotated[
        str | None,
        Query(
            description=(
                "Comma-separated optional response expansions. "
                f"Supported: '{INCLUDE_BOOK_MEMBERSHIPS}' annotates each entry "
                "with the signed-in user's own books that contain it."
            ),
        ),
    ] = None,
) -> set[str]:
    """Parse the ``include`` query parameter into a set of expansion keys."""
    return {
        token.strip() for token in (include or "").split(",") if token.strip()
    }


Include = Annotated[set[str], Depends(_include)]


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


def search_dep(
    searchable_columns: list[InstrumentedAttribute[Any]],
) -> Callable[..., SearchFilter]:
    """Return a FastAPI dependency that parses the search query parameter.

    The returned dependency accepts an optional ``search`` query parameter and
    produces a ``SearchFilter`` containing:

    - A WHERE clause that matches rows where *any* searchable column contains
      the term (``ILIKE '%term%'``, OR logic).
    - A CASE expression for relevance ordering: columns earlier in
      ``searchable_columns`` rank higher (lower integer value), so name
      matches sort before type matches when the client has not overridden
      ordering. Prepend this to the client-requested ordering expressions.

    An absent or blank search term returns a ``SearchFilter`` with
    ``where=None`` and an empty ``order_priority``.

    Args:
        searchable_columns: ORM attributes to search, in priority order.
            Earlier columns rank higher in the relevance sort.

    Returns:
        A FastAPI dependency function that injects a ``search`` query
        parameter and returns a ``SearchFilter``.

    Example:
        _MONSTER_SEARCH = search_dep([Monster.name, Monster.monster_type])
        MonsterSearch = Annotated[SearchFilter, Depends(_MONSTER_SEARCH)]
    """
    col_names = ", ".join(col.key for col in searchable_columns)

    def _dep(
        search: Annotated[
            str | None,
            Query(
                description=(
                    "Case-insensitive substring search. Matches against "
                    f"{col_names}. Results are relevance-ordered: earlier "
                    "columns rank higher than later ones."
                ),
            ),
        ] = None,
    ) -> SearchFilter:
        """Parse search term and return a SearchFilter.

        Args:
            search: Optional search term. Stripped of leading/trailing
                whitespace; treated as absent when blank.

        Returns:
            A ``SearchFilter`` with a WHERE clause and relevance ordering
            expression when a non-blank term is provided, or a no-op
            ``SearchFilter`` when the term is absent or blank.
        """
        term = (search or "").strip()
        if not term:
            return SearchFilter(where=None, order_priority=[])

        pattern = f"%{term}%"
        conditions = [col.ilike(pattern) for col in searchable_columns]
        where = conditions[0] if len(conditions) == 1 else or_(*conditions)
        priority = case(
            *[
                (col.ilike(pattern), idx)
                for idx, col in enumerate(searchable_columns)
            ],
            else_=len(searchable_columns),
        ).asc()
        return SearchFilter(where=where, order_priority=[priority])

    return _dep

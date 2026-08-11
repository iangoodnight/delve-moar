"""Spell list and detail endpoints."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select

from app.auth.dependencies import OptionalCurrentUser
from app.authz import (
    assert_books_readable,
    attach_book_memberships,
    book_memberships_for,
)
from app.constants import SRD_NAMESPACE
from app.db import DbSession
from app.dependencies import (
    INCLUDE_BOOK_MEMBERSHIPS,
    Include,
    Pagination,
    SearchFilter,
    ordering_dep,
    search_dep,
)
from app.exceptions import get_or_404
from app.models import BookSpell, Spell
from app.schemas.errors import ErrorResponse
from app.schemas.pagination import PaginatedResultset
from app.schemas.spells import SpellDetail, SpellSummary
from app.utils import build_links, fetch_page, paginate

router = APIRouter(prefix="/spells", tags=["Spells"])

_SPELL_ORDERING = ordering_dep(
    {
        "level": Spell.level,
        "name": Spell.name,
        "school": Spell.school,
    },
    default="level:asc,name:asc",
)
SpellOrdering = Annotated[list[Any], Depends(_SPELL_ORDERING)]

_SPELL_SEARCH = search_dep([Spell.name])
SpellSearch = Annotated[SearchFilter, Depends(_SPELL_SEARCH)]

MAX_SPELL_LEVEL = 9


@router.get(
    "",
    response_model=PaginatedResultset[SpellSummary],
    summary="List spells",
    responses={
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "model": ErrorResponse,
            "description": "Validation error",
        },
    },
)
async def list_spells(
    request: Request,
    session: DbSession,
    user: OptionalCurrentUser,
    params: Pagination,
    ordering: SpellOrdering,
    search: SpellSearch,
    include: Include,
    school: Annotated[
        str | None,
        Query(description="Exact match on spell school (e.g. 'evocation')."),
    ] = None,
    level_min: Annotated[
        int | None,
        Query(
            ge=0,
            le=MAX_SPELL_LEVEL,
            description="Inclusive minimum spell level (0-9).",
        ),
    ] = None,
    level_max: Annotated[
        int | None,
        Query(
            ge=0,
            le=MAX_SPELL_LEVEL,
            description="Inclusive maximum spell level (0-9).",
        ),
    ] = None,
    book: Annotated[
        list[uuid.UUID] | None,
        Query(
            description=(
                "Filter to spells in any of these books (repeat for "
                "multiple). Each must be a book you can read, else 404."
            ),
        ),
    ] = None,
) -> PaginatedResultset[SpellSummary]:
    """List spells with optional school, level-range, and book filters."""
    stmt = select(Spell).where(Spell.source_namespace == SRD_NAMESPACE)

    if search.where is not None:
        stmt = stmt.where(search.where)
    if school:
        stmt = stmt.where(Spell.school == school)
    if level_min is not None:
        stmt = stmt.where(Spell.level >= level_min)
    if level_max is not None:
        stmt = stmt.where(Spell.level <= level_max)
    if book:
        await assert_books_readable(session, book, user)
        stmt = stmt.where(
            Spell.id.in_(
                select(BookSpell.spell_id).where(BookSpell.book_id.in_(book))
            )
        )

    total, rows = await fetch_page(
        session,
        stmt,
        ordering=[*search.order_priority, *ordering],
        params=params,
    )
    data = [SpellSummary.model_validate(row) for row in rows]
    if INCLUDE_BOOK_MEMBERSHIPS in include and user is not None:
        await attach_book_memberships(
            session, user, rows, data, BookSpell, BookSpell.spell_id
        )
    return paginate(
        data=data,
        total=total,
        params=params,
        links=build_links(request, total, params.offset, params.limit),
    )


@router.get(
    "/{slug}",
    response_model=SpellDetail,
    summary="Get spell",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Spell not found",
        },
    },
)
async def get_spell(
    slug: str,
    session: DbSession,
    user: OptionalCurrentUser,
    include: Include,
    namespace: Annotated[
        str,
        Query(
            description=(
                "Source namespace to search in. Defaults to the SRD 5.1 "
                "namespace. Use 'user:{user_id}' for homebrew content."
            ),
        ),
    ] = SRD_NAMESPACE,
) -> SpellDetail:
    """Get a single spell by slug within a source namespace."""
    result = await session.scalar(
        select(Spell).where(
            Spell.slug == slug,
            Spell.source_namespace == namespace,
        )
    )
    spell = get_or_404(
        result, resource="spell", identifier=f"{namespace}:{slug}"
    )
    detail = SpellDetail.model_validate(spell)
    if INCLUDE_BOOK_MEMBERSHIPS in include and user is not None:
        memberships = await book_memberships_for(
            session, user, [spell.id], BookSpell, BookSpell.spell_id
        )
        detail.book_memberships = memberships.get(spell.id, [])
    return detail

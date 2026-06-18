"""Monster list and detail endpoints."""

from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select

from app.constants import SRD_NAMESPACE
from app.db import DbSession
from app.dependencies import Pagination, SearchFilter, ordering_dep, search_dep
from app.exceptions import get_or_404
from app.models import Monster
from app.schemas.errors import ErrorResponse
from app.schemas.monsters import MonsterDetail, MonsterSummary
from app.schemas.pagination import PaginatedResultset
from app.utils import build_links, fetch_page, paginate

router = APIRouter(prefix="/monsters", tags=["Monsters"])

_MONSTER_ORDERING = ordering_dep(
    {
        "challenge_rating": Monster.challenge_rating,
        "monster_type": Monster.monster_type,
        "name": Monster.name,
    },
    default="challenge_rating:asc,name:asc",
)
MonsterOrdering = Annotated[list[Any], Depends(_MONSTER_ORDERING)]

_MONSTER_SEARCH = search_dep([Monster.name, Monster.monster_type])
MonsterSearch = Annotated[SearchFilter, Depends(_MONSTER_SEARCH)]


@router.get(
    "",
    response_model=PaginatedResultset[MonsterSummary],
    summary="List monsters",
    responses={
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "model": ErrorResponse,
            "description": "Validation error",
        },
    },
)
async def list_monsters(
    request: Request,
    session: DbSession,
    params: Pagination,
    ordering: MonsterOrdering,
    search: MonsterSearch,
    monster_type: Annotated[
        str | None,
        Query(
            alias="type",
            description="Exact match on monster type (e.g. 'undead').",
        ),
    ] = None,
    cr_min: Annotated[
        Decimal | None,
        Query(ge=0, description="Inclusive minimum challenge rating."),
    ] = None,
    cr_max: Annotated[
        Decimal | None,
        Query(ge=0, description="Inclusive maximum challenge rating."),
    ] = None,
) -> PaginatedResultset[MonsterSummary]:
    """List monsters with optional type and challenge-rating filters."""
    stmt = select(Monster).where(Monster.source_namespace == SRD_NAMESPACE)

    if search.where is not None:
        stmt = stmt.where(search.where)
    if monster_type:
        stmt = stmt.where(Monster.monster_type == monster_type)
    if cr_min is not None:
        stmt = stmt.where(Monster.challenge_rating >= cr_min)
    if cr_max is not None:
        stmt = stmt.where(Monster.challenge_rating <= cr_max)

    total, rows = await fetch_page(
        session,
        stmt,
        ordering=[*search.order_priority, *ordering],
        params=params,
    )
    return paginate(
        data=[MonsterSummary.model_validate(row) for row in rows],
        total=total,
        params=params,
        links=build_links(request, total, params.offset, params.limit),
    )


@router.get(
    "/{slug}",
    response_model=MonsterDetail,
    summary="Get monster",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Monster not found",
        },
    },
)
async def get_monster(
    slug: str,
    session: DbSession,
    namespace: Annotated[
        str,
        Query(
            description=(
                "Source namespace to search in. Defaults to the SRD 5.1 "
                "namespace. Use 'user:{user_id}' for homebrew content."
            ),
        ),
    ] = SRD_NAMESPACE,
) -> MonsterDetail:
    """Get a single monster by slug within a source namespace."""
    result = await session.scalar(
        select(Monster).where(
            Monster.slug == slug,
            Monster.source_namespace == namespace,
        )
    )
    monster = get_or_404(
        result, resource="monster", identifier=f"{namespace}:{slug}"
    )
    return MonsterDetail.model_validate(monster)

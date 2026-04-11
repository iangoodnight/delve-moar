"""Monster list and detail endpoints."""

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.constants import SRD_NAMESPACE
from app.db import DbSession
from app.dependencies import Pagination
from app.exceptions import get_or_404
from app.models import Monster
from app.schemas.errors import ErrorResponse
from app.schemas.monsters import MonsterDetail, MonsterSummary
from app.schemas.pagination import PaginatedResultset
from app.utils import fetch_page, paginate

router = APIRouter(prefix="/monsters", tags=["Monsters"])


@router.get(
    "",
    response_model=PaginatedResultset[MonsterSummary],
    summary="List monsters",
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def list_monsters(
    session: DbSession,
    params: Pagination,
    search: Annotated[
        str | None,
        Query(description="Case-insensitive substring match on monster name."),
    ] = None,
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
    """Return a paginated list of monsters with optional filters.

    Args:
        session: Database session, injected by dependency.
        params: Pagination parameters, injected by dependency.
        search: Optional case-insensitive search term against monster name.
        monster_type: Optional exact match for the monster_type field.
        cr_min: Inclusive minimum challenge rating filter.
        cr_max: Inclusive maximum challenge rating filter.

    Returns:
        A paginated resultset containing monster summaries and pagination
        metadata.

    Example:
        GET /v1/monsters?search=dragon&limit=5&offset=10
        GET /v1/monsters?type=undead&cr_min=1&cr_max=5
        GET /v1/monsters?cr_max=0.25
        GET /v1/monsters?search=giant&type=humanoid&cr_min=2
    """
    stmt = select(Monster).where(Monster.source_namespace == SRD_NAMESPACE)

    if search:
        stmt = stmt.where(Monster.name.ilike(f"%{search}%"))
    if monster_type:
        stmt = stmt.where(Monster.monster_type == monster_type)
    if cr_min is not None:
        stmt = stmt.where(Monster.challenge_rating >= cr_min)
    if cr_max is not None:
        stmt = stmt.where(Monster.challenge_rating <= cr_max)

    total, rows = await fetch_page(
        session,
        stmt,
        ordering=[
            Monster.challenge_rating.asc().nulls_last(),
            Monster.name.asc(),
        ],
        params=params,
    )
    return paginate(
        data=[MonsterSummary.model_validate(row) for row in rows],
        total=total,
        params=params,
    )


@router.get(
    "/{slug}",
    response_model=MonsterDetail,
    summary="Get monster",
    responses={
        404: {"model": ErrorResponse, "description": "Monster not found"},
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
    """Return full details for a single monster by slug.

    Args:
        slug: The URL-safe unique identifier for the monster.
        session: Database session, injected by dependency.
        namespace: The source namespace to look in (default: srd-5.1).

    Returns:
        The full monster details, including all original content fields.

    Raises:
        AppError: With status 404 if no monster is found.

    Example:
        GET /v1/monsters/tarrasque
        GET /v1/monsters/giant-spider?namespace=user:1234
    """
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

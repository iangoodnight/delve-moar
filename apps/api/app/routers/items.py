"""Item list and detail endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select

from app.constants import SRD_NAMESPACE
from app.db import DbSession
from app.dependencies import Pagination, SearchFilter, ordering_dep, search_dep
from app.exceptions import get_or_404
from app.models import Item
from app.schemas.errors import ErrorResponse
from app.schemas.items import ItemDetail, ItemSummary
from app.schemas.pagination import PaginatedResultset
from app.utils import build_links, fetch_page, paginate

router = APIRouter(prefix="/items", tags=["Items"])

_ITEM_ORDERING = ordering_dep(
    {
        "item_category": Item.item_category,
        "name": Item.name,
        "rarity": Item.rarity,
    },
    default="item_category:asc,name:asc",
)
ItemOrdering = Annotated[list[Any], Depends(_ITEM_ORDERING)]

_ITEM_SEARCH = search_dep([Item.name, Item.item_category])
ItemSearch = Annotated[SearchFilter, Depends(_ITEM_SEARCH)]


@router.get(
    "",
    response_model=PaginatedResultset[ItemSummary],
    summary="List items",
    responses={
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "model": ErrorResponse,
            "description": "Validation error",
        },
    },
)
async def list_items(
    request: Request,
    session: DbSession,
    params: Pagination,
    ordering: ItemOrdering,
    search: ItemSearch,
    item_category: Annotated[
        str | None,
        Query(
            description="Exact match on item category (e.g. 'weapon'). "
            "This is not guaranteed to be present for all items, as it depends "
            "on the source data.",
        ),
    ] = None,
    rarity: Annotated[
        str | None,
        Query(
            description="Exact match on item rarity (e.g. 'common'). "
            "This is not guaranteed to be present for all items, as it depends "
            "on the source data. Set to 'none' to filter for items with no "
            "rarity (equipment).",
        ),
    ] = None,
) -> PaginatedResultset[ItemSummary]:
    """List items with optional category and rarity filters."""
    stmt = select(Item).where(Item.source_namespace == SRD_NAMESPACE)

    if search.where is not None:
        stmt = stmt.where(search.where)
    if item_category:
        stmt = stmt.where(Item.item_category == item_category)
    if rarity:
        if rarity.lower() == "none":
            stmt = stmt.where(Item.rarity.is_(None))
        else:
            stmt = stmt.where(Item.rarity == rarity)

    total, rows = await fetch_page(
        session,
        stmt,
        ordering=[*search.order_priority, *ordering],
        params=params,
    )
    return paginate(
        data=[ItemSummary.model_validate(row) for row in rows],
        total=total,
        params=params,
        links=build_links(request, total, params.offset, params.limit),
    )


@router.get(
    "/{slug}",
    response_model=ItemDetail,
    summary="Get item details",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Item not found",
        },
    },
)
async def get_item(
    slug: str,
    session: DbSession,
    namespace: Annotated[
        str,
        Query(
            description="The source namespace of the item, used to "
            "disambiguate items with the same slug from different sources. "
            "Known values: 'srd-5.1', 'srd-2024', 'user:{user_id}'.",
        ),
    ] = SRD_NAMESPACE,
) -> ItemDetail:
    """Get a single item by slug within a source namespace."""
    result = await session.scalar(
        select(Item).where(
            Item.slug == slug,
            Item.source_namespace == namespace,
        )
    )
    item = get_or_404(
        result,
        resource="item",
        identifier=f"{namespace}:{slug}",
    )
    return ItemDetail.model_validate(item)

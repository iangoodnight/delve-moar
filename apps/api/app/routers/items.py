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
    """Return a paginated list of items with optional filters.

    Args:
        request: Current HTTP request, used to build pagination links.
        session: Database session, injected by dependency.
        params: Pagination parameters, injected by dependency.
        ordering: SQLAlchemy ordering expressions, injected by dependency.
        search: Parsed search filter, injected by dependency.
        item_category: Optional exact match for the item_category field.
        rarity: Optional exact match for the rarity field. Set to 'none' to
            filter for items with no rarity (equipment).

    Returns:
        A paginated list of items matching the filters, with summary information
        and pagination metadata.

    Example:
        GET /v1/items?search=sword&item_category=weapon&rarity=rare&limit=2
        GET /v1/items?item_category=potion&rarity=none
        GET /v1/items?order_by=name:asc&limit=5&offset=10
        GET /v1/items?order_by=rarity:desc,name:asc
    """
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
    """Return full details for a single item by slug and namespace.

    Args:
        slug: The unique slug identifier for the item.
        session: Database session, injected by dependency.
        namespace: The source namespace to look up the item in.

    Returns:
        The full details of the item, including all original content fields.

    Raises:
        AppError: With status 404 if no item is found.

    Example:
        GET /v1/items/flame-tongue?namespace=srd-5.1
        GET /v1/items/amulet-of-health?namespace=user:1234
    """
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

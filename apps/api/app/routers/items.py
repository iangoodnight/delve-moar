"""Item list and detail endpoints."""

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
from app.models import BookItem, Item
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
    user: OptionalCurrentUser,
    params: Pagination,
    ordering: ItemOrdering,
    search: ItemSearch,
    include: Include,
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
    book: Annotated[
        list[uuid.UUID] | None,
        Query(
            description=(
                "Filter to items in any of these books (repeat for "
                "multiple). Each must be a book you can read, else 404."
            ),
        ),
    ] = None,
) -> PaginatedResultset[ItemSummary]:
    """List items with optional category, rarity, and book filters."""
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
    if book:
        await assert_books_readable(session, book, user)
        stmt = stmt.where(
            Item.id.in_(
                select(BookItem.item_id).where(BookItem.book_id.in_(book))
            )
        )

    total, rows = await fetch_page(
        session,
        stmt,
        ordering=[*search.order_priority, *ordering],
        params=params,
    )
    data = [ItemSummary.model_validate(row) for row in rows]
    if INCLUDE_BOOK_MEMBERSHIPS in include and user is not None:
        await attach_book_memberships(
            session, user, rows, data, BookItem, BookItem.item_id
        )
    return paginate(
        data=data,
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
    user: OptionalCurrentUser,
    include: Include,
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
    detail = ItemDetail.model_validate(item)
    if INCLUDE_BOOK_MEMBERSHIPS in include and user is not None:
        memberships = await book_memberships_for(
            session, user, [item.id], BookItem, BookItem.item_id
        )
        detail.book_memberships = memberships.get(item.id, [])
    return detail

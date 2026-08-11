"""Campaign endpoints -- owned collections that share books with members.

CRUD for user-owned campaigns plus enabling/disabling the books a campaign
shares. Reads are owner-or-member; writes (including enabling a book) are
owner-only. Access goes through ``app.authz`` -- endpoints never hand-roll
checks. Members read the *content* of a campaign's enabled books through the
existing book/content endpoints, which now honor the campaign read branch
(ADR 0011, ADR 0014). Invites land in a follow-up.
"""

import uuid
from collections.abc import Sequence
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import func, select

from app.auth.dependencies import CurrentUser, require_csrf
from app.authz import (
    get_readable_campaign,
    get_writable_book,
    get_writable_campaign,
    readable_campaigns_predicate,
)
from app.db import DbSession
from app.dependencies import (
    Pagination,
    SearchFilter,
    ordering_dep,
    search_dep,
)
from app.models import Book, Campaign, CampaignBook, CampaignMember, User
from app.schemas.auth import Author
from app.schemas.books import BookSummary
from app.schemas.campaigns import (
    CampaignCreate,
    CampaignDetail,
    CampaignSummary,
    CampaignUpdate,
)
from app.schemas.errors import ErrorResponse
from app.schemas.pagination import PaginatedResultset
from app.utils import build_links, fetch_page, paginate

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

_CAMPAIGN_ORDERING = ordering_dep(
    {
        "name": Campaign.name,
        "created_at": Campaign.created_at,
        "updated_at": Campaign.updated_at,
    },
    default="name:asc",
)
CampaignOrdering = Annotated[list[Any], Depends(_CAMPAIGN_ORDERING)]
_CAMPAIGN_SEARCH = search_dep([Campaign.name, Campaign.description])
CampaignSearch = Annotated[SearchFilter, Depends(_CAMPAIGN_SEARCH)]

_CAMPAIGN_BOOK_ORDERING = ordering_dep({"name": Book.name}, default="name:asc")
CampaignBookOrdering = Annotated[list[Any], Depends(_CAMPAIGN_BOOK_ORDERING)]
_CAMPAIGN_BOOK_SEARCH = search_dep([Book.name, Book.description])
CampaignBookSearch = Annotated[SearchFilter, Depends(_CAMPAIGN_BOOK_SEARCH)]

_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorResponse,
        "description": "Campaign not found",
    },
}
_FORBIDDEN_OR_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorResponse,
        "description": "Not the campaign's owner",
    },
    **_NOT_FOUND,
}


async def _owner_handles(
    db: DbSession, campaigns: Sequence[Campaign]
) -> dict[uuid.UUID, str]:
    """Map each campaign's owner id to its public handle, batched."""
    owner_ids = {c.owner_id for c in campaigns}
    if not owner_ids:
        return {}
    rows = await db.execute(
        select(User.id, User.username).where(User.id.in_(owner_ids))
    )
    return {owner_id: username for owner_id, username in rows}


async def _owner_handle(db: DbSession, owner_id: uuid.UUID) -> str:
    """Return the owner's public handle (owner_id is a non-null FK)."""
    handle = await db.scalar(select(User.username).where(User.id == owner_id))
    return handle or ""


def _summary(
    campaign: Campaign, owner_handle: str, user: User
) -> CampaignSummary:
    """Project a campaign to its summary with the viewer's role."""
    role = "owner" if campaign.owner_id == user.id else "member"
    return CampaignSummary(
        id=campaign.id,
        name=campaign.name,
        description=campaign.description,
        owner=Author(username=owner_handle),
        role=role,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def _detail(
    campaign: Campaign, owner_handle: str, user: User, counts: tuple[int, int]
) -> CampaignDetail:
    """Project a campaign to its detail view with member + book counts."""
    members, books = counts
    return CampaignDetail(
        **_summary(campaign, owner_handle, user).model_dump(),
        member_count=members,
        book_count=books,
    )


async def _counts(db: DbSession, campaign_id: uuid.UUID) -> tuple[int, int]:
    """Return the (member, enabled-book) counts for a campaign."""
    counts: list[int] = []
    for join in (CampaignMember, CampaignBook):
        total = await db.scalar(
            select(func.count())
            .select_from(join)
            .where(join.campaign_id == campaign_id)
        )
        counts.append(total or 0)
    return counts[0], counts[1]


def _book_summary(book: Book, user: User) -> BookSummary:
    """Project an enabled book to a summary (mirrors the books router).

    The owner handle is attached only when the book is the viewer's own, so
    it reads as a "mine" marker; a member sees ``null`` for the owner's books.
    """
    owner = Author(username=user.username) if book.owner_id == user.id else None
    return BookSummary(
        id=book.id,
        name=book.name,
        slug=book.slug,
        description=book.description,
        is_public=book.is_public,
        is_system=book.is_system,
        owner=owner,
        created_at=book.created_at,
        updated_at=book.updated_at,
    )


@router.get(
    "",
    response_model=PaginatedResultset[CampaignSummary],
    summary="List campaigns",
)
async def list_campaigns(
    request: Request,
    db: DbSession,
    user: CurrentUser,
    params: Pagination,
    ordering: CampaignOrdering,
    search: CampaignSearch,
) -> PaginatedResultset[CampaignSummary]:
    """List the campaigns the user owns or is a member of."""
    stmt = select(Campaign).where(readable_campaigns_predicate(user))
    if search.where is not None:
        stmt = stmt.where(search.where)
    total, rows = await fetch_page(
        db,
        stmt,
        ordering=[*search.order_priority, *ordering],
        params=params,
    )
    handles = await _owner_handles(db, rows)
    return paginate(
        data=[_summary(c, handles[c.owner_id], user) for c in rows],
        total=total,
        params=params,
        links=build_links(request, total, params.offset, params.limit),
    )


@router.post(
    "",
    response_model=CampaignDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a campaign",
    dependencies=[Depends(require_csrf)],
)
async def create_campaign(
    payload: CampaignCreate, db: DbSession, user: CurrentUser
) -> CampaignDetail:
    """Create a new campaign owned by the current user."""
    campaign = Campaign(
        owner_id=user.id, name=payload.name, description=payload.description
    )
    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)
    await db.commit()
    return _detail(campaign, user.username, user, (0, 0))


@router.get(
    "/{campaign_id}",
    response_model=CampaignDetail,
    summary="Get a campaign",
    responses=_NOT_FOUND,
)
async def get_campaign(
    campaign_id: uuid.UUID, db: DbSession, user: CurrentUser
) -> CampaignDetail:
    """Get a campaign the user owns or is a member of, with its counts."""
    campaign = await get_readable_campaign(db, campaign_id, user)
    handle = await _owner_handle(db, campaign.owner_id)
    return _detail(campaign, handle, user, await _counts(db, campaign_id))


@router.patch(
    "/{campaign_id}",
    response_model=CampaignDetail,
    summary="Update a campaign",
    dependencies=[Depends(require_csrf)],
    responses=_FORBIDDEN_OR_NOT_FOUND,
)
async def update_campaign(
    campaign_id: uuid.UUID,
    payload: CampaignUpdate,
    db: DbSession,
    user: CurrentUser,
) -> CampaignDetail:
    """Update a campaign's name and/or description (owner-only)."""
    campaign = await get_writable_campaign(db, campaign_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(campaign, field, value)
    await db.commit()
    await db.refresh(campaign)
    return _detail(
        campaign, user.username, user, await _counts(db, campaign_id)
    )


@router.delete(
    "/{campaign_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a campaign",
    dependencies=[Depends(require_csrf)],
    responses=_FORBIDDEN_OR_NOT_FOUND,
)
async def delete_campaign(
    campaign_id: uuid.UUID, db: DbSession, user: CurrentUser
) -> None:
    """Delete a campaign (owner-only).

    Its membership and enabled-book links cascade; the books themselves and
    their owned content are untouched.
    """
    campaign = await get_writable_campaign(db, campaign_id, user)
    await db.delete(campaign)
    await db.commit()


@router.get(
    "/{campaign_id}/books",
    response_model=PaginatedResultset[BookSummary],
    summary="List a campaign's enabled books",
    responses=_NOT_FOUND,
)
async def list_campaign_books(
    campaign_id: uuid.UUID,
    request: Request,
    db: DbSession,
    user: CurrentUser,
    params: Pagination,
    ordering: CampaignBookOrdering,
    search: CampaignBookSearch,
) -> PaginatedResultset[BookSummary]:
    """List the books enabled on a campaign the user can read."""
    await get_readable_campaign(db, campaign_id, user)
    stmt = (
        select(Book)
        .join(CampaignBook, CampaignBook.book_id == Book.id)
        .where(CampaignBook.campaign_id == campaign_id)
    )
    if search.where is not None:
        stmt = stmt.where(search.where)
    total, rows = await fetch_page(
        db,
        stmt,
        ordering=[*search.order_priority, *ordering],
        params=params,
    )
    return paginate(
        data=[_book_summary(book, user) for book in rows],
        total=total,
        params=params,
        links=build_links(request, total, params.offset, params.limit),
    )


@router.put(
    "/{campaign_id}/books/{book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Enable a book on a campaign",
    dependencies=[Depends(require_csrf)],
    responses=_FORBIDDEN_OR_NOT_FOUND,
)
async def enable_book(
    campaign_id: uuid.UUID,
    book_id: uuid.UUID,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Enable a book you own on a campaign you own (idempotent).

    Sharing flows owner-to-members, so you may only enable books you own: a
    book merely shared *to* you through another campaign is not re-shareable.
    ``get_writable_book`` enforces owner-only (404 if you can't read it, 403
    if you can read but do not own it).
    """
    campaign = await get_writable_campaign(db, campaign_id, user)
    book = await get_writable_book(db, book_id, user)
    existing = await db.scalar(
        select(CampaignBook).where(
            CampaignBook.campaign_id == campaign.id,
            CampaignBook.book_id == book.id,
        )
    )
    if existing is None:
        db.add(CampaignBook(campaign_id=campaign.id, book_id=book.id))
        await db.commit()


@router.delete(
    "/{campaign_id}/books/{book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Disable a book on a campaign",
    dependencies=[Depends(require_csrf)],
    responses=_FORBIDDEN_OR_NOT_FOUND,
)
async def disable_book(
    campaign_id: uuid.UUID,
    book_id: uuid.UUID,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Disable a book on a campaign you own (idempotent)."""
    campaign = await get_writable_campaign(db, campaign_id, user)
    existing = await db.scalar(
        select(CampaignBook).where(
            CampaignBook.campaign_id == campaign.id,
            CampaignBook.book_id == book_id,
        )
    )
    if existing is not None:
        await db.delete(existing)
        await db.commit()

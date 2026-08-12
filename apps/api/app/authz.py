"""The canonical authorization policy module (ADR 0011).

"Can user U perform action A on resource R" lives here and nowhere else.
Endpoints call these helpers; they never hand-roll access checks. This is a
hard convention enforced in review (ADR 0011), so the access rule has a
single definition that cannot drift between endpoints.

The rules, per ADR 0011 (campaign model) and ADR 0014 (books):

- Read: a user may read a book they own, a public book, or a book enabled
  on a campaign they are a member of (the campaign-shared branch, added with
  #176 -- campaigns, members, and the campaign-to-book join now exist).
- Write / delete: owner-only, and system books (the SRD catalog) are never
  writable.

Content (monsters, spells, items) reaches users through books (ADR 0014), so
in Phase 1b the book is the unit access is decided on: the predicate below is
applied to book queries directly, and to content queries via the ``book``
filter. When homebrew content gains its own ``owner_id`` (#177-#179), the
owner-only write rule generalizes to those rows; add that branch here rather
than in the content routers.

## Extension points (kept here so read paths never drift apart)

- Campaign-shared reads (#176, implemented): ``readable_books_predicate``
  carries a third OR branch -- books enabled on a campaign the user is a
  member of (``_campaign_shared_book_ids``). Because ``get_readable_book`` and
  ``assert_books_readable`` build on the predicate, they picked up campaign
  sharing with no change to the content routers.
- Link-token reads (ADR 0012, 1b stretch): an unauthenticated, single-content
  read path. ADR 0012 requires it to funnel through this module so it cannot
  diverge from the campaign path.
"""

import uuid
from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from fastapi import status
from sqlalchemy import ColumnElement, Select, or_, select
from sqlalchemy.orm import InstrumentedAttribute

from app.config import settings
from app.db import DbSession
from app.exceptions import AppError, get_or_404
from app.models import (
    Book,
    Campaign,
    CampaignBook,
    CampaignInvite,
    CampaignMember,
    User,
)
from app.schemas.book_membership import BookMembership


def _campaign_shared_book_ids(user: User) -> Select[tuple[uuid.UUID]]:
    """Ids of books shared with the user through a campaign they belong to.

    A book enabled on a campaign (``campaign_books``) is readable by every
    member of that campaign (``campaign_members``) -- ADR 0011's shared read
    rule, resolved through enabled books per ADR 0014.
    """
    return (
        select(CampaignBook.book_id)
        .join(
            CampaignMember,
            CampaignMember.campaign_id == CampaignBook.campaign_id,
        )
        .where(CampaignMember.user_id == user.id)
    )


def readable_books_predicate(user: User | None) -> ColumnElement[bool]:
    """SQLAlchemy predicate for books the user may read.

    Owner, public, or -- for an authenticated user -- a book enabled on a
    campaign they are a member of (#176). The single source of truth for
    "readable": list queries filter with it directly and ``get_readable_book``
    runs it for one id, so a single-book read and a list read can never
    disagree, and the content routers' ``book`` filter inherits the campaign
    branch for free.
    """
    if user is None:
        return Book.is_public.is_(True)
    return or_(
        Book.owner_id == user.id,
        Book.is_public.is_(True),
        Book.id.in_(_campaign_shared_book_ids(user)),
    )


async def get_readable_book(
    db: DbSession, book_id: uuid.UUID, user: User
) -> Book:
    """Load a book the user may read (owner or public), else 404.

    A private book the user does not own is indistinguishable from a missing
    one (both 404), so a private book's existence is never revealed. Runs
    ``readable_books_predicate`` so "readable" has one definition.
    """
    book = await db.scalar(
        select(Book).where(Book.id == book_id, readable_books_predicate(user))
    )
    return get_or_404(book, resource="book", identifier=str(book_id))


async def get_writable_book(
    db: DbSession, book_id: uuid.UUID, user: User
) -> Book:
    """Load a book the user may modify (owns it, not a system book), or raise.

    404 if the book is not even readable (its existence stays hidden); 403 if
    it is readable but not the user's to change (the public SRD system book, or
    another user's public book).
    """
    book = await get_readable_book(db, book_id, user)
    if book.is_system or book.owner_id != user.id:
        raise AppError(
            status=status.HTTP_403_FORBIDDEN,
            developer_message=f"Book '{book_id}' is not owned by the user.",
            user_message="You can only modify your own books.",
            error_code="FORBIDDEN",
            more_info=f"{settings.public_url}/docs",
        )
    return book


def readable_campaigns_predicate(user: User) -> ColumnElement[bool]:
    """SQLAlchemy predicate for campaigns the user may read.

    A campaign the user owns, or one they are a member of. Used by the
    campaign list query and by ``get_readable_campaign`` for a single id, so
    the two never disagree.
    """
    return or_(
        Campaign.owner_id == user.id,
        Campaign.id.in_(
            select(CampaignMember.campaign_id).where(
                CampaignMember.user_id == user.id
            )
        ),
    )


async def get_readable_campaign(
    db: DbSession, campaign_id: uuid.UUID, user: User
) -> Campaign:
    """Load a campaign the user may read (owner or member), else 404.

    A campaign the user neither owns nor belongs to is indistinguishable from
    a missing one (both 404), so its existence is never revealed.
    """
    campaign = await db.scalar(
        select(Campaign).where(
            Campaign.id == campaign_id, readable_campaigns_predicate(user)
        )
    )
    return get_or_404(
        campaign, resource="campaign", identifier=str(campaign_id)
    )


async def get_writable_campaign(
    db: DbSession, campaign_id: uuid.UUID, user: User
) -> Campaign:
    """Load a campaign the user may modify (owns), else raise.

    404 if the campaign is not even readable (existence stays hidden); 403 if
    it is readable (the user is a member) but not the owner. Write and delete
    are owner-only in Phase 1b (ADR 0011).
    """
    campaign = await get_readable_campaign(db, campaign_id, user)
    if campaign.owner_id != user.id:
        raise AppError(
            status=status.HTTP_403_FORBIDDEN,
            developer_message=(
                f"Campaign '{campaign_id}' is not owned by the user."
            ),
            user_message="You can only modify campaigns you own.",
            error_code="FORBIDDEN",
            more_info=f"{settings.public_url}/docs",
        )
    return campaign


async def get_own_invite(
    db: DbSession, invite_id: uuid.UUID, user: User
) -> CampaignInvite:
    """Load a pending invite addressed to the user, else 404.

    An invite that is unknown, addressed to someone else, or expired is
    indistinguishable from a missing one (all 404), so an invite's existence
    is never revealed to anyone but its own invitee. Backs accept and decline.
    """
    invite = await db.scalar(
        select(CampaignInvite).where(
            CampaignInvite.id == invite_id,
            CampaignInvite.invitee_user_id == user.id,
            CampaignInvite.expires_at > datetime.now(UTC),
        )
    )
    return get_or_404(invite, resource="invite", identifier=str(invite_id))


async def authorize_member_removal(
    db: DbSession,
    campaign_id: uuid.UUID,
    target_handle: str,
    user: User,
) -> Campaign:
    """Authorize removing the ``target_handle`` member from a campaign.

    404 if the campaign is not even readable to the caller (existence stays
    hidden). Otherwise the owner may remove any member, and a member may
    remove only themselves (leaving); anything else is 403. Members are
    addressed by their public handle -- unique and stable in Phase 1b -- so no
    internal user id has to be exposed to make removal possible. Returns the
    campaign so the caller can act on it.
    """
    campaign = await get_readable_campaign(db, campaign_id, user)
    is_owner = campaign.owner_id == user.id
    is_self = target_handle == user.username
    if not (is_owner or is_self):
        raise AppError(
            status=status.HTTP_403_FORBIDDEN,
            developer_message=(
                "Only the owner may remove other members; members may remove "
                "only themselves."
            ),
            user_message="You can only remove yourself from this campaign.",
            error_code="FORBIDDEN",
            more_info=f"{settings.public_url}/docs",
        )
    return campaign


async def assert_books_readable(
    db: DbSession, book_ids: Sequence[uuid.UUID], user: User | None
) -> None:
    """Raise 404 unless every id is a book the user may read.

    Unreadable and unknown ids are indistinguishable (both 404), so a private
    book's existence is never revealed.
    """
    if not book_ids:
        return
    rows = await db.scalars(
        select(Book.id).where(
            Book.id.in_(book_ids), readable_books_predicate(user)
        )
    )
    readable = set(rows)
    for book_id in book_ids:
        if book_id not in readable:
            get_or_404(None, resource="book", identifier=str(book_id))


async def book_memberships_for(
    db: DbSession,
    user: User,
    content_ids: Sequence[uuid.UUID],
    join_model: Any,
    join_fk: InstrumentedAttribute[Any],
) -> dict[uuid.UUID, list[BookMembership]]:
    """Map each content id to the user's own books that contain it.

    Only the user's owned books are included; the public SRD system book is
    excluded (it holds every SRD entry and would annotate everything).
    """
    if not content_ids:
        return {}
    rows = await db.execute(
        select(join_fk, Book.id, Book.name, Book.slug)
        .join(Book, Book.id == join_model.book_id)
        .where(join_fk.in_(content_ids), Book.owner_id == user.id)
        .order_by(Book.name.asc())
    )
    memberships: dict[uuid.UUID, list[BookMembership]] = defaultdict(list)
    for content_id, book_id, name, slug in rows:
        memberships[content_id].append(
            BookMembership(id=book_id, name=name, slug=slug)
        )
    return memberships


async def attach_book_memberships(
    db: DbSession,
    user: User,
    rows: Sequence[Any],
    summaries: Sequence[Any],
    join_model: Any,
    join_fk: InstrumentedAttribute[Any],
) -> None:
    """Annotate each summary in place with the user's books containing its row.

    Entries the user has not collected get an empty list, so an opted-in
    response distinguishes "checked, none" from the omitted (not-requested)
    default.
    """
    memberships = await book_memberships_for(
        db, user, [row.id for row in rows], join_model, join_fk
    )
    for row, summary in zip(rows, summaries, strict=True):
        summary.book_memberships = memberships.get(row.id, [])

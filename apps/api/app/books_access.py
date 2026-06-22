"""Shared book access helpers: the read predicate and content annotation.

ADR 0014's book read rule (owner-or-public) and the content-membership query
live here so the books router and the content routers (monsters, spells,
items) share one predicate. When the authorization policy module arrives with
#176/#172, this is the seam it absorbs.
"""

import uuid
from collections import defaultdict
from collections.abc import Sequence
from typing import Any

from sqlalchemy import ColumnElement, or_, select
from sqlalchemy.orm import InstrumentedAttribute

from app.db import DbSession
from app.exceptions import get_or_404
from app.models import Book, User
from app.schemas.book_membership import BookMembership


def readable_books_predicate(user: User | None) -> ColumnElement[bool]:
    """SQLAlchemy predicate for books the user may read (owner or public)."""
    if user is None:
        return Book.is_public.is_(True)
    return or_(Book.owner_id == user.id, Book.is_public.is_(True))


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

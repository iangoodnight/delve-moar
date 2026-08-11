"""The access-control matrix for the authorization policy module (#172).

Exercises ``app.authz`` in isolation -- owner, public, anonymous, and
unauthorized cases -- so the read/write rules have a test that does not
depend on any endpoint wiring. The shared-campaign read branch (ADR 0011)
is reserved below and filled in with #176, when campaigns first exist.
"""

import uuid
from dataclasses import dataclass

import pytest
from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.authz import (
    assert_books_readable,
    get_readable_book,
    get_writable_book,
    readable_books_predicate,
)
from app.exceptions import AppError
from app.models import Book, User


@dataclass
class World:
    """Two users and one book of each access shape, for the matrix below."""

    alice: User
    bob: User
    books: dict[str, Book]


async def _seed_world(db: AsyncSession) -> World:
    """Seed Alice and Bob plus a private/public book each and a system book."""
    alice = User(username="alice", email="alice@example.com", password_hash="x")
    bob = User(username="bob", email="bob@example.com", password_hash="x")
    db.add_all([alice, bob])
    await db.flush()

    def _book(
        slug: str,
        owner_id: uuid.UUID | None,
        *,
        is_public: bool,
        is_system: bool = False,
    ) -> Book:
        return Book(
            owner_id=owner_id,
            name=slug,
            slug=slug,
            description=None,
            is_public=is_public,
            is_system=is_system,
        )

    books = {
        "alice_private": _book("alice-private", alice.id, is_public=False),
        "alice_public": _book("alice-public", alice.id, is_public=True),
        "bob_private": _book("bob-private", bob.id, is_public=False),
        "bob_public": _book("bob-public", bob.id, is_public=True),
        "system": _book("srd-5.1", None, is_public=True, is_system=True),
    }
    db.add_all(list(books.values()))
    await db.flush()
    return World(alice=alice, bob=bob, books=books)


async def _readable_ids(db: AsyncSession, user: User | None) -> set[uuid.UUID]:
    """Ids of every book the predicate admits for ``user``."""
    rows = await db.scalars(
        select(Book.id).where(readable_books_predicate(user))
    )
    return set(rows)


# ── readable_books_predicate ─────────────────────────────────────────────────


async def test_predicate_owner_sees_own_plus_all_public(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    ids = await _readable_ids(db_session, world.alice)
    book = world.books
    assert book["alice_private"].id in ids  # own, private
    assert book["alice_public"].id in ids  # own, public
    assert book["bob_public"].id in ids  # someone else's, public
    assert book["system"].id in ids  # system, public
    assert book["bob_private"].id not in ids  # someone else's, private


async def test_predicate_anonymous_sees_only_public(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    ids = await _readable_ids(db_session, None)
    book = world.books
    assert ids == {
        book["alice_public"].id,
        book["bob_public"].id,
        book["system"].id,
    }


# ── get_readable_book ────────────────────────────────────────────────────────


async def test_get_readable_book_owner_reads_own_private(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    target = world.books["alice_private"]
    book = await get_readable_book(db_session, target.id, world.alice)
    assert book.id == target.id


async def test_get_readable_book_allows_public_and_system(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    for key in ("bob_public", "system"):
        target = world.books[key]
        book = await get_readable_book(db_session, target.id, world.alice)
        assert book.id == target.id


async def test_get_readable_book_hides_others_private_as_404(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    with pytest.raises(AppError) as exc:
        await get_readable_book(
            db_session, world.books["bob_private"].id, world.alice
        )
    assert exc.value.status == status.HTTP_404_NOT_FOUND
    assert exc.value.error_code == "RESOURCE_NOT_FOUND"


async def test_get_readable_book_missing_is_404(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    with pytest.raises(AppError) as exc:
        await get_readable_book(db_session, uuid.uuid4(), world.alice)
    assert exc.value.status == status.HTTP_404_NOT_FOUND


# ── get_writable_book ────────────────────────────────────────────────────────


async def test_get_writable_book_owner_writes_own(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    # public-but-owned is still writable; only system + not-owned block writes
    for key in ("alice_private", "alice_public"):
        target = world.books[key]
        book = await get_writable_book(db_session, target.id, world.alice)
        assert book.id == target.id


async def test_get_writable_book_public_not_owned_is_403(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    with pytest.raises(AppError) as exc:
        await get_writable_book(
            db_session, world.books["bob_public"].id, world.alice
        )
    assert exc.value.status == status.HTTP_403_FORBIDDEN
    assert exc.value.error_code == "FORBIDDEN"


async def test_get_writable_book_system_is_403(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    with pytest.raises(AppError) as exc:
        await get_writable_book(
            db_session, world.books["system"].id, world.alice
        )
    assert exc.value.status == status.HTTP_403_FORBIDDEN


async def test_get_writable_book_others_private_is_404_not_403(
    db_session: AsyncSession,
) -> None:
    # The non-leak invariant: a book you cannot even read is 404, never 403 --
    # a 403 would confirm the private book exists.
    world = await _seed_world(db_session)
    with pytest.raises(AppError) as exc:
        await get_writable_book(
            db_session, world.books["bob_private"].id, world.alice
        )
    assert exc.value.status == status.HTTP_404_NOT_FOUND


async def test_get_writable_book_missing_is_404(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    with pytest.raises(AppError) as exc:
        await get_writable_book(db_session, uuid.uuid4(), world.alice)
    assert exc.value.status == status.HTTP_404_NOT_FOUND


# ── assert_books_readable ────────────────────────────────────────────────────


async def test_assert_books_readable_empty_is_noop(
    db_session: AsyncSession,
) -> None:
    # No ids -> returns without a query or a 404; routers guard with `if book`.
    await assert_books_readable(db_session, [], None)


async def test_assert_books_readable_all_readable_passes(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    await assert_books_readable(
        db_session,
        [world.books["alice_private"].id, world.books["system"].id],
        world.alice,
    )


async def test_assert_books_readable_rejects_an_unreadable_id(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    with pytest.raises(AppError) as exc:
        await assert_books_readable(
            db_session,
            [world.books["alice_private"].id, world.books["bob_private"].id],
            world.alice,
        )
    assert exc.value.status == status.HTTP_404_NOT_FOUND


async def test_assert_books_readable_rejects_unknown_id(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    with pytest.raises(AppError) as exc:
        await assert_books_readable(db_session, [uuid.uuid4()], world.alice)
    assert exc.value.status == status.HTTP_404_NOT_FOUND


# ── reserved: shared-campaign read branch (ADR 0011), lands with #176 ─────────


@pytest.mark.skip(
    reason="campaign infra (owner, members, campaign-book join) lands in #176"
)
async def test_campaign_member_can_read_enabled_book() -> None:
    """A member may read a book enabled on a campaign they belong to.

    ADR 0011's shared-campaign read branch. When #176 adds the campaign
    OR-branch to ``readable_books_predicate``, implement this: seed a campaign
    owned by Alice with Bob as a member, enable one of Alice's private books
    on it, then assert Bob may read that book (and only that one) through both
    the predicate and ``get_readable_book`` -- while Bob's access to Alice's
    other private books stays denied.
    """

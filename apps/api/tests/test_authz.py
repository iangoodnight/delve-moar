"""The access-control matrix for the authorization policy module (#172).

Exercises ``app.authz`` in isolation -- owner, public, anonymous, and
unauthorized cases -- so the read/write rules have a test that does not
depend on any endpoint wiring. Includes the shared-campaign read branch
(ADR 0011), implemented with #176 now that campaigns exist.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.authz import (
    assert_books_readable,
    get_own_invite,
    get_readable_book,
    get_readable_campaign,
    get_writable_book,
    get_writable_campaign,
    readable_books_predicate,
    readable_campaigns_predicate,
)
from app.exceptions import AppError
from app.models import (
    Book,
    Campaign,
    CampaignBook,
    CampaignInvite,
    CampaignMember,
    User,
)


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


# ── shared-campaign read branch (ADR 0011), implemented with #176 ────────────


async def _campaign(
    db: AsyncSession, owner: User, name: str = "Campaign"
) -> Campaign:
    campaign = Campaign(owner_id=owner.id, name=name)
    db.add(campaign)
    await db.flush()
    return campaign


async def _add_member(db: AsyncSession, campaign: Campaign, user: User) -> None:
    db.add(CampaignMember(campaign_id=campaign.id, user_id=user.id))
    await db.flush()


async def _enable_book(
    db: AsyncSession, campaign: Campaign, book: Book
) -> None:
    db.add(CampaignBook(campaign_id=campaign.id, book_id=book.id))
    await db.flush()


async def _private_book(db: AsyncSession, owner: User, slug: str) -> Book:
    book = Book(
        owner_id=owner.id,
        name=slug,
        slug=slug,
        description=None,
        is_public=False,
        is_system=False,
    )
    db.add(book)
    await db.flush()
    return book


async def test_campaign_member_can_read_enabled_book(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    shared = world.books["alice_private"]
    # a second private book of Alice's, enabled on nothing
    unshared = await _private_book(db_session, world.alice, "alice-private-2")
    campaign = await _campaign(db_session, world.alice, "Curse of Strahd")
    await _add_member(db_session, campaign, world.bob)
    await _enable_book(db_session, campaign, shared)

    ids = await _readable_ids(db_session, world.bob)
    assert shared.id in ids  # enabled on Bob's campaign -> readable
    assert unshared.id not in ids  # not enabled -> still Alice's alone

    # the single-id read agrees with the predicate
    got = await get_readable_book(db_session, shared.id, world.bob)
    assert got.id == shared.id
    with pytest.raises(AppError):
        await get_readable_book(db_session, unshared.id, world.bob)


async def test_enabled_book_is_not_shared_with_non_members(
    db_session: AsyncSession,
) -> None:
    # a book enabled on a campaign Bob is NOT a member of stays private
    world = await _seed_world(db_session)
    shared = world.books["alice_private"]
    campaign = await _campaign(db_session, world.alice, "Solo Prep")
    await _enable_book(db_session, campaign, shared)

    assert shared.id not in await _readable_ids(db_session, world.bob)


# ── campaign access helpers ──────────────────────────────────────────────────


async def test_readable_campaigns_predicate_owner_and_member(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    owned = await _campaign(db_session, world.bob, "Bob's Game")
    member_of = await _campaign(db_session, world.alice, "Alice's Game")
    await _add_member(db_session, member_of, world.bob)
    await _campaign(db_session, world.alice, "Alice's Other Game")  # bob absent

    rows = await db_session.scalars(
        select(Campaign.id).where(readable_campaigns_predicate(world.bob))
    )
    assert set(rows) == {owned.id, member_of.id}


async def test_get_readable_campaign_owner_member_stranger(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    campaign = await _campaign(db_session, world.alice, "Alice's Game")
    await _add_member(db_session, campaign, world.bob)

    owner_view = await get_readable_campaign(
        db_session, campaign.id, world.alice
    )
    assert owner_view.id == campaign.id
    member_view = await get_readable_campaign(
        db_session, campaign.id, world.bob
    )
    assert member_view.id == campaign.id

    carol = User(username="carol", email="carol@example.com", password_hash="x")
    db_session.add(carol)
    await db_session.flush()
    with pytest.raises(AppError) as exc:
        await get_readable_campaign(db_session, campaign.id, carol)
    assert exc.value.status == status.HTTP_404_NOT_FOUND


async def test_get_writable_campaign_owner_only(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    campaign = await _campaign(db_session, world.alice, "Alice's Game")
    await _add_member(db_session, campaign, world.bob)

    writable = await get_writable_campaign(db_session, campaign.id, world.alice)
    assert writable.id == campaign.id
    # a member is readable but not the owner -> 403
    with pytest.raises(AppError) as exc:
        await get_writable_campaign(db_session, campaign.id, world.bob)
    assert exc.value.status == status.HTTP_403_FORBIDDEN
    with pytest.raises(AppError) as missing:
        await get_writable_campaign(db_session, uuid.uuid4(), world.alice)
    assert missing.value.status == status.HTTP_404_NOT_FOUND


async def test_get_writable_campaign_stranger_is_404_not_403(
    db_session: AsyncSession,
) -> None:
    # a campaign you cannot even read is 404, never 403 (no existence leak)
    world = await _seed_world(db_session)
    campaign = await _campaign(db_session, world.alice, "Alice's Game")
    with pytest.raises(AppError) as exc:
        await get_writable_campaign(db_session, campaign.id, world.bob)
    assert exc.value.status == status.HTTP_404_NOT_FOUND


# ── get_own_invite (campaign invites, #176) ──────────────────────────────────


async def _make_invite(
    db: AsyncSession,
    campaign: Campaign,
    invitee: User,
    *,
    expires_in: timedelta = timedelta(days=7),
) -> CampaignInvite:
    invite = CampaignInvite(
        campaign_id=campaign.id,
        invitee_user_id=invitee.id,
        expires_at=datetime.now(UTC) + expires_in,
    )
    db.add(invite)
    await db.flush()
    return invite


async def test_get_own_invite_returns_invitees_pending_invite(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    campaign = await _campaign(db_session, world.alice, "Alice's Game")
    invite = await _make_invite(db_session, campaign, world.bob)
    got = await get_own_invite(db_session, invite.id, world.bob)
    assert got.id == invite.id


async def test_get_own_invite_hides_another_users_invite_as_404(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    campaign = await _campaign(db_session, world.alice, "Alice's Game")
    invite = await _make_invite(db_session, campaign, world.bob)
    carol = User(username="carol", email="carol@example.com", password_hash="x")
    db_session.add(carol)
    await db_session.flush()
    with pytest.raises(AppError) as exc:
        await get_own_invite(db_session, invite.id, carol)
    assert exc.value.status == status.HTTP_404_NOT_FOUND


async def test_get_own_invite_missing_is_404(
    db_session: AsyncSession,
) -> None:
    world = await _seed_world(db_session)
    with pytest.raises(AppError) as exc:
        await get_own_invite(db_session, uuid.uuid4(), world.bob)
    assert exc.value.status == status.HTTP_404_NOT_FOUND


async def test_get_own_invite_expired_is_404(
    db_session: AsyncSession,
) -> None:
    # an expired invite is indistinguishable from a missing one (both 404)
    world = await _seed_world(db_session)
    campaign = await _campaign(db_session, world.alice, "Alice's Game")
    invite = await _make_invite(
        db_session, campaign, world.bob, expires_in=timedelta(days=-1)
    )
    with pytest.raises(AppError) as exc:
        await get_own_invite(db_session, invite.id, world.bob)
    assert exc.value.status == status.HTTP_404_NOT_FOUND

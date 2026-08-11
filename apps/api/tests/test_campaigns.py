"""Endpoint tests for the campaigns API (#176, ADR 0011/0014).

httpx persists cookies per client, so the session + CSRF cookies set at
signup carry into later requests. Multi-user cases use a second client (its
own cookie jar) against the same app and shared test transaction; members
are seeded directly since the invite flow lands in a follow-up.
"""

import uuid

from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.main import app
from app.models import Book, CampaignMember, User

CAMPAIGNS = "/v1/campaigns"
BOOKS = "/v1/books"


def _csrf(client: AsyncClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies[settings.csrf_cookie_name]}


async def _signup(client: AsyncClient, username: str) -> None:
    resp = await client.post(
        "/v1/auth/signup",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "supersecret",
        },
    )
    assert resp.status_code == 201


async def _create(client: AsyncClient, name: str) -> dict[str, object]:
    resp = await client.post(
        CAMPAIGNS, json={"name": name}, headers=_csrf(client)
    )
    assert resp.status_code == 201
    body: dict[str, object] = resp.json()
    return body


async def _create_book(client: AsyncClient, name: str) -> str:
    resp = await client.post(BOOKS, json={"name": name}, headers=_csrf(client))
    assert resp.status_code == 201
    book_id: str = resp.json()["id"]
    return book_id


async def test_list_requires_auth(db_client: AsyncClient) -> None:
    resp = await db_client.get(CAMPAIGNS)
    assert resp.status_code == 401


async def test_create_sets_owner_and_counts(db_client: AsyncClient) -> None:
    await _signup(db_client, "dungeonmaster")
    body = await _create(db_client, "Curse of Strahd")
    assert body["name"] == "Curse of Strahd"
    assert body["role"] == "owner"
    assert body["owner"] == {"username": "dungeonmaster"}
    assert body["memberCount"] == 0
    assert body["bookCount"] == 0


async def test_list_shows_owned_campaigns(db_client: AsyncClient) -> None:
    await _signup(db_client, "lister")
    await _create(db_client, "Alpha")
    await _create(db_client, "Beta")
    resp = await db_client.get(CAMPAIGNS)
    assert resp.status_code == 200
    names = {row["name"] for row in resp.json()["data"]}
    assert names == {"Alpha", "Beta"}


async def test_update_campaign(db_client: AsyncClient) -> None:
    await _signup(db_client, "editor")
    campaign_id = (await _create(db_client, "Draft"))["id"]
    resp = await db_client.patch(
        f"{CAMPAIGNS}/{campaign_id}",
        json={"name": "Final", "description": "ready"},
        headers=_csrf(db_client),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Final"
    assert resp.json()["description"] == "ready"


async def test_delete_campaign(db_client: AsyncClient) -> None:
    await _signup(db_client, "remover")
    campaign_id = (await _create(db_client, "Doomed"))["id"]
    deleted = await db_client.delete(
        f"{CAMPAIGNS}/{campaign_id}", headers=_csrf(db_client)
    )
    assert deleted.status_code == 204
    assert (
        await db_client.get(f"{CAMPAIGNS}/{campaign_id}")
    ).status_code == 404


async def test_stranger_cannot_see_or_modify_campaign(
    db_client: AsyncClient,
) -> None:
    # a campaign a user neither owns nor belongs to is 404 (never 403), so its
    # existence is not revealed
    await _signup(db_client, "ownerdm")
    campaign_id = (await _create(db_client, "Private Game"))["id"]
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as stranger:
        await _signup(stranger, "outsider")
        assert (
            await stranger.get(f"{CAMPAIGNS}/{campaign_id}")
        ).status_code == 404
        assert (
            await stranger.patch(
                f"{CAMPAIGNS}/{campaign_id}",
                json={"name": "hijacked"},
                headers=_csrf(stranger),
            )
        ).status_code == 404
        assert (
            await stranger.delete(
                f"{CAMPAIGNS}/{campaign_id}", headers=_csrf(stranger)
            )
        ).status_code == 404


async def test_member_can_read_but_not_modify(
    db_client: AsyncClient, db_session: AsyncSession
) -> None:
    await _signup(db_client, "campaignowner")
    campaign_id = (await _create(db_client, "Shared Game"))["id"]
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as member:
        await _signup(member, "player")
        player_id = await db_session.scalar(
            select(User.id).where(User.username == "player")
        )
        db_session.add(
            CampaignMember(
                campaign_id=uuid.UUID(str(campaign_id)), user_id=player_id
            )
        )
        await db_session.flush()

        got = await member.get(f"{CAMPAIGNS}/{campaign_id}")
        assert got.status_code == 200
        assert got.json()["role"] == "member"
        assert got.json()["owner"] == {"username": "campaignowner"}
        # a member is not the owner -> owner-only write is forbidden
        patched = await member.patch(
            f"{CAMPAIGNS}/{campaign_id}",
            json={"name": "nope"},
            headers=_csrf(member),
        )
        assert patched.status_code == 403


async def test_enable_list_and_disable_book(db_client: AsyncClient) -> None:
    await _signup(db_client, "curator")
    campaign_id = (await _create(db_client, "With Books"))["id"]
    book_id = await _create_book(db_client, "My Homebrew")

    enabled = await db_client.put(
        f"{CAMPAIGNS}/{campaign_id}/books/{book_id}", headers=_csrf(db_client)
    )
    assert enabled.status_code == 204
    # idempotent
    assert (
        await db_client.put(
            f"{CAMPAIGNS}/{campaign_id}/books/{book_id}",
            headers=_csrf(db_client),
        )
    ).status_code == 204

    listed = await db_client.get(f"{CAMPAIGNS}/{campaign_id}/books")
    assert listed.status_code == 200
    assert [b["id"] for b in listed.json()["data"]] == [book_id]

    detail = await db_client.get(f"{CAMPAIGNS}/{campaign_id}")
    assert detail.json()["bookCount"] == 1

    disabled = await db_client.delete(
        f"{CAMPAIGNS}/{campaign_id}/books/{book_id}", headers=_csrf(db_client)
    )
    assert disabled.status_code == 204
    empty = await db_client.get(f"{CAMPAIGNS}/{campaign_id}/books")
    assert empty.json()["data"] == []


async def test_cannot_enable_a_book_you_do_not_own(
    db_client: AsyncClient, db_session: AsyncSession
) -> None:
    # the SRD system book is public but not the user's -> 403 (own books only)
    system = Book(
        owner_id=None,
        name="SRD 5.1",
        slug="srd-5.1",
        description="System book.",
        is_public=True,
        is_system=True,
    )
    db_session.add(system)
    await db_session.flush()
    await _signup(db_client, "sharer")
    campaign_id = (await _create(db_client, "Game"))["id"]
    resp = await db_client.put(
        f"{CAMPAIGNS}/{campaign_id}/books/{system.id}",
        headers=_csrf(db_client),
    )
    assert resp.status_code == 403


async def test_cannot_enable_book_on_someone_elses_campaign(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "gameowner")
    campaign_id = (await _create(db_client, "Not Yours"))["id"]
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as other:
        await _signup(other, "intruder")
        book_id = await _create_book(other, "Intruder's Book")
        # the campaign is not readable to the intruder -> 404, existence hidden
        resp = await other.put(
            f"{CAMPAIGNS}/{campaign_id}/books/{book_id}",
            headers=_csrf(other),
        )
        assert resp.status_code == 404

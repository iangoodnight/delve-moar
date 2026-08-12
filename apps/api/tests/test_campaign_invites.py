"""Endpoint tests for campaign invites + membership (#176).

Covers the membership lifecycle end to end: invite by handle -> accept ->
member reads a campaign-enabled book; plus decline, revoke, remove, leave, the
conflict guards, and the non-leak invariants (a handle is never turned into an
email oracle, and one user cannot act on another's invite).

httpx persists cookies per client, so the session + CSRF cookies set at signup
carry into later requests. Multi-user cases use a second client (its own cookie
jar) against the same app and shared test transaction.
"""

from datetime import UTC, datetime, timedelta

from httpx import ASGITransport, AsyncClient, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.main import app
from app.models import CampaignInvite

CAMPAIGNS = "/v1/campaigns"
BOOKS = "/v1/books"
INVITES = "/v1/campaign-invites"


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


async def _create_campaign(client: AsyncClient, name: str) -> str:
    resp = await client.post(
        CAMPAIGNS, json={"name": name}, headers=_csrf(client)
    )
    assert resp.status_code == 201
    campaign_id: str = resp.json()["id"]
    return campaign_id


async def _create_book(client: AsyncClient, name: str) -> str:
    resp = await client.post(BOOKS, json={"name": name}, headers=_csrf(client))
    assert resp.status_code == 201
    book_id: str = resp.json()["id"]
    return book_id


async def _invite(
    client: AsyncClient, campaign_id: str, handle: str
) -> Response:
    return await client.post(
        f"{CAMPAIGNS}/{campaign_id}/invites",
        json={"handle": handle},
        headers=_csrf(client),
    )


async def _accept(client: AsyncClient, invite_id: str) -> Response:
    return await client.post(
        f"{INVITES}/{invite_id}/accept", headers=_csrf(client)
    )


async def _decline(client: AsyncClient, invite_id: str) -> Response:
    return await client.post(
        f"{INVITES}/{invite_id}/decline", headers=_csrf(client)
    )


def _second_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _signup_other(username: str) -> None:
    """Register a user via a throwaway client (shares the test transaction)."""
    async with _second_client() as other:
        await _signup(other, username)


# ── full lifecycle ───────────────────────────────────────────────────────────


async def test_invite_accept_makes_member_and_grants_book_read(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "thedm")
    campaign_id = await _create_campaign(db_client, "Curse of Strahd")
    # a private book the DM owns, enabled on the campaign
    book_id = await _create_book(db_client, "DM Notes")
    assert (
        await db_client.put(
            f"{CAMPAIGNS}/{campaign_id}/books/{book_id}",
            headers=_csrf(db_client),
        )
    ).status_code == 204

    async with _second_client() as player:
        await _signup(player, "player")
        # before joining, the DM's private book is hidden (404, not 403)
        assert (await player.get(f"{BOOKS}/{book_id}")).status_code == 404

        invited = await _invite(db_client, campaign_id, "player")
        assert invited.status_code == 201
        assert invited.json()["invitee"] == {"username": "player"}

        # the invitee sees the invite with the campaign + owner handle
        listed = await player.get(INVITES)
        assert listed.status_code == 200
        rows = listed.json()
        assert len(rows) == 1
        assert rows[0]["campaignName"] == "Curse of Strahd"
        assert rows[0]["owner"] == {"username": "thedm"}
        invite_id = rows[0]["id"]

        accepted = await _accept(player, invite_id)
        assert accepted.status_code == 204

        # now a member: reads the campaign as a member and the enabled book
        got = await player.get(f"{CAMPAIGNS}/{campaign_id}")
        assert got.status_code == 200
        assert got.json()["role"] == "member"
        assert (await player.get(f"{BOOKS}/{book_id}")).status_code == 200
        # the invite is consumed
        assert (await player.get(INVITES)).json() == []
        # and the DM's member count reflects it
        assert (await db_client.get(f"{CAMPAIGNS}/{campaign_id}")).json()[
            "memberCount"
        ] == 1


async def test_decline_leaves_no_membership(db_client: AsyncClient) -> None:
    await _signup(db_client, "owner")
    campaign_id = await _create_campaign(db_client, "Declined Game")
    async with _second_client() as player:
        await _signup(player, "decliner")
        invite_id = (await _invite(db_client, campaign_id, "decliner")).json()[
            "id"
        ]
        declined = await _decline(player, invite_id)
        assert declined.status_code == 204
        assert (await player.get(INVITES)).json() == []
        # not a member -> the private campaign is 404 to them
        assert (
            await player.get(f"{CAMPAIGNS}/{campaign_id}")
        ).status_code == 404


async def test_owner_lists_and_revokes_invite(db_client: AsyncClient) -> None:
    await _signup(db_client, "lister")
    campaign_id = await _create_campaign(db_client, "Managed Game")
    async with _second_client() as invitee:
        await _signup(invitee, "guest")
        invite_id = (await _invite(db_client, campaign_id, "guest")).json()[
            "id"
        ]
        # owner sees the pending invite in the roster of invites
        pending = await db_client.get(f"{CAMPAIGNS}/{campaign_id}/invites")
        assert pending.status_code == 200
        assert [i["invitee"] for i in pending.json()] == [{"username": "guest"}]

        revoked = await db_client.delete(
            f"{CAMPAIGNS}/{campaign_id}/invites/{invite_id}",
            headers=_csrf(db_client),
        )
        assert revoked.status_code == 204
        assert (
            await db_client.get(f"{CAMPAIGNS}/{campaign_id}/invites")
        ).json() == []
        # the invitee no longer sees it
        assert (await invitee.get(INVITES)).json() == []


async def test_roster_lists_members_by_handle(db_client: AsyncClient) -> None:
    await _signup(db_client, "thegm")
    campaign_id = await _create_campaign(db_client, "Table")
    async with _second_client() as player:
        await _signup(player, "rogue")
        invite_id = (await _invite(db_client, campaign_id, "rogue")).json()[
            "id"
        ]
        await _accept(player, invite_id)

        roster = await db_client.get(f"{CAMPAIGNS}/{campaign_id}/members")
        assert roster.status_code == 200
        body = roster.json()
        assert [m["user"] for m in body] == [{"username": "rogue"}]
        assert "joinedAt" in body[0]
        # a member can read the roster too
        assert (
            await player.get(f"{CAMPAIGNS}/{campaign_id}/members")
        ).status_code == 200


async def test_owner_removes_member_revokes_access(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "boss")
    campaign_id = await _create_campaign(db_client, "Fire Me")
    book_id = await _create_book(db_client, "Secrets")
    await db_client.put(
        f"{CAMPAIGNS}/{campaign_id}/books/{book_id}", headers=_csrf(db_client)
    )
    async with _second_client() as player:
        await _signup(player, "fired")
        invite_id = (await _invite(db_client, campaign_id, "fired")).json()[
            "id"
        ]
        await _accept(player, invite_id)
        assert (await player.get(f"{BOOKS}/{book_id}")).status_code == 200

        removed = await db_client.delete(
            f"{CAMPAIGNS}/{campaign_id}/members/fired", headers=_csrf(db_client)
        )
        assert removed.status_code == 204
        # access revoked with membership
        assert (await player.get(f"{BOOKS}/{book_id}")).status_code == 404
        assert (
            await player.get(f"{CAMPAIGNS}/{campaign_id}")
        ).status_code == 404
        # idempotent
        assert (
            await db_client.delete(
                f"{CAMPAIGNS}/{campaign_id}/members/fired",
                headers=_csrf(db_client),
            )
        ).status_code == 204


async def test_member_can_leave_campaign(db_client: AsyncClient) -> None:
    await _signup(db_client, "host")
    campaign_id = await _create_campaign(db_client, "Leaveable")
    async with _second_client() as player:
        await _signup(player, "leaver")
        invite_id = (await _invite(db_client, campaign_id, "leaver")).json()[
            "id"
        ]
        await _accept(player, invite_id)
        # the member removes themselves by their own handle
        left = await player.delete(
            f"{CAMPAIGNS}/{campaign_id}/members/leaver", headers=_csrf(player)
        )
        assert left.status_code == 204
        assert (
            await player.get(f"{CAMPAIGNS}/{campaign_id}")
        ).status_code == 404


# ── guards / conflicts ───────────────────────────────────────────────────────


async def test_cannot_invite_yourself(db_client: AsyncClient) -> None:
    await _signup(db_client, "solo")
    campaign_id = await _create_campaign(db_client, "Alone")
    resp = await _invite(db_client, campaign_id, "solo")
    assert resp.status_code == 400
    assert resp.json()["errorCode"] == "CANNOT_INVITE_SELF"


async def test_cannot_invite_existing_member(db_client: AsyncClient) -> None:
    await _signup(db_client, "chief")
    campaign_id = await _create_campaign(db_client, "Full")
    async with _second_client() as player:
        await _signup(player, "already")
        invite_id = (await _invite(db_client, campaign_id, "already")).json()[
            "id"
        ]
        await _accept(player, invite_id)
        resp = await _invite(db_client, campaign_id, "already")
        assert resp.status_code == 409
        assert resp.json()["errorCode"] == "ALREADY_MEMBER"


async def test_duplicate_invite_conflicts(db_client: AsyncClient) -> None:
    await _signup(db_client, "repeat")
    campaign_id = await _create_campaign(db_client, "Twice")
    await _signup_other("duptarget")
    first = await _invite(db_client, campaign_id, "duptarget")
    assert first.status_code == 201
    second = await _invite(db_client, campaign_id, "duptarget")
    assert second.status_code == 409
    assert second.json()["errorCode"] == "ALREADY_INVITED"


async def test_invite_unknown_handle_is_404(db_client: AsyncClient) -> None:
    await _signup(db_client, "seeker")
    campaign_id = await _create_campaign(db_client, "Search")
    resp = await _invite(db_client, campaign_id, "ghost")
    assert resp.status_code == 404


async def test_only_owner_can_invite(db_client: AsyncClient) -> None:
    await _signup(db_client, "realowner")
    campaign_id = await _create_campaign(db_client, "Owned")
    await _signup_other("targetuser")
    async with _second_client() as stranger:
        await _signup(stranger, "nosy")
        # a stranger cannot even see the campaign -> 404 (existence hidden)
        resp = await _invite(stranger, campaign_id, "targetuser")
        assert resp.status_code == 404


async def test_member_cannot_invite_or_remove_others(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "captain")
    campaign_id = await _create_campaign(db_client, "Crew")
    await _signup_other("victim")
    async with _second_client() as member:
        await _signup(member, "crewmate")
        invite_id = (await _invite(db_client, campaign_id, "crewmate")).json()[
            "id"
        ]
        await _accept(member, invite_id)
        # a member is readable but not the owner -> owner-only invite is 403
        assert (await _invite(member, campaign_id, "victim")).status_code == 403
        # a member cannot remove another handle (only themselves) -> 403
        assert (
            await member.delete(
                f"{CAMPAIGNS}/{campaign_id}/members/captain",
                headers=_csrf(member),
            )
        ).status_code == 403


# ── non-leak / auth ──────────────────────────────────────────────────────────


async def test_cannot_act_on_another_users_invite(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "inviter")
    campaign_id = await _create_campaign(db_client, "Private Invite")
    async with _second_client() as invitee, _second_client() as attacker:
        await _signup(invitee, "target")
        await _signup(attacker, "attacker")
        invite_id = (await _invite(db_client, campaign_id, "target")).json()[
            "id"
        ]
        # someone else's invite id is an indistinguishable 404
        assert (await _accept(attacker, invite_id)).status_code == 404
        assert (await _decline(attacker, invite_id)).status_code == 404
        # the real invitee's invite still stands
        assert len((await invitee.get(INVITES)).json()) == 1


async def test_invite_views_expose_only_public_handle(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "dungeon")
    campaign_id = await _create_campaign(db_client, "No Email Leak")
    async with _second_client() as invitee:
        await _signup(invitee, "private")
        created = (await _invite(db_client, campaign_id, "private")).json()
        # owner-facing invite carries the handle, never the email or user id
        assert created["invitee"] == {"username": "private"}
        assert "email" not in str(created)
        # invitee-facing view carries only the owner's handle
        row = (await invitee.get(INVITES)).json()[0]
        assert row["owner"] == {"username": "dungeon"}
        assert "email" not in str(row)


async def test_invite_endpoints_require_auth(db_client: AsyncClient) -> None:
    # the invitee list requires a session (no CSRF gate on a GET)
    assert (await db_client.get(INVITES)).status_code == 401
    await _signup(db_client, "authed")
    campaign_id = await _create_campaign(db_client, "Auth")
    async with _second_client() as anon:
        # a cookieless mutation is stopped by the CSRF gate (403) before the
        # auth check runs -- the same posture as every other write endpoint
        assert (
            await anon.post(
                f"{CAMPAIGNS}/{campaign_id}/invites", json={"handle": "xyz"}
            )
        ).status_code == 403


# ── expiry ───────────────────────────────────────────────────────────────────


async def test_expired_invite_is_hidden_and_unacceptable(
    db_client: AsyncClient, db_session: AsyncSession
) -> None:
    await _signup(db_client, "timed")
    campaign_id = await _create_campaign(db_client, "Expiring")
    async with _second_client() as player:
        await _signup(player, "latecomer")
        invite_id = (await _invite(db_client, campaign_id, "latecomer")).json()[
            "id"
        ]
        # force the invite to have already lapsed
        invite = await db_session.scalar(select(CampaignInvite))
        assert invite is not None
        invite.expires_at = datetime.now(UTC) - timedelta(days=1)
        await db_session.flush()

        # gone from the invitee's list and unacceptable
        assert (await player.get(INVITES)).json() == []
        assert (await _accept(player, invite_id)).status_code == 404
        # re-inviting the same user refreshes the lapsed invite (201, not 409)
        again = await _invite(db_client, campaign_id, "latecomer")
        assert again.status_code == 201
        assert len((await player.get(INVITES)).json()) == 1

"""Invitations addressed to the current user (#176).

The invitee's side of campaign membership: list the invites waiting for you,
and accept or decline them. Owners manage invites from the campaign side (see
``app.routers.campaigns``); these routes are self-scoped -- you can only see
and act on invites addressed to *you*. Access goes through ``app.authz``
(``get_own_invite``), so a stranger's, unknown, or expired invite is an
indistinguishable 404 and no invite's existence leaks.

The prefix is ``/campaign-invites`` rather than ``/campaigns/invites`` so the
literal path is not captured by the ``/campaigns/{campaign_id}`` route.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy import select

from app.auth.dependencies import CurrentUser, require_csrf
from app.authz import get_own_invite
from app.db import DbSession
from app.models import Campaign, CampaignInvite, CampaignMember, User
from app.schemas.auth import Author
from app.schemas.campaigns import MyCampaignInvite
from app.schemas.errors import ErrorResponse

router = APIRouter(prefix="/campaign-invites", tags=["Campaign Invites"])

_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorResponse,
        "description": "Invite not found, expired, or not addressed to you",
    },
}


@router.get(
    "",
    response_model=list[MyCampaignInvite],
    summary="List my pending invites",
)
async def list_my_invites(
    db: DbSession, user: CurrentUser
) -> list[MyCampaignInvite]:
    """List the current user's pending, unexpired campaign invites.

    Each carries the campaign name and its owner's public handle, so the
    invitee knows who invited them and to what; no data about other members
    is exposed.
    """
    rows = await db.execute(
        select(CampaignInvite, Campaign.name, User.username)
        .join(Campaign, Campaign.id == CampaignInvite.campaign_id)
        .join(User, User.id == Campaign.owner_id)
        .where(
            CampaignInvite.invitee_user_id == user.id,
            CampaignInvite.expires_at > datetime.now(UTC),
        )
        .order_by(CampaignInvite.created_at.desc())
    )
    return [
        MyCampaignInvite(
            id=invite.id,
            campaign_id=invite.campaign_id,
            campaign_name=campaign_name,
            owner=Author(username=owner_handle),
            expires_at=invite.expires_at,
            created_at=invite.created_at,
        )
        for invite, campaign_name, owner_handle in rows
    ]


@router.post(
    "/{invite_id}/accept",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Accept an invite",
    dependencies=[Depends(require_csrf)],
    responses=_NOT_FOUND,
)
async def accept_invite(
    invite_id: uuid.UUID, db: DbSession, user: CurrentUser
) -> None:
    """Accept an invite addressed to you, becoming a member of the campaign.

    Membership is created (granting read access to the campaign's enabled
    books) and the invite is consumed, atomically. An invite that is unknown,
    expired, or addressed to someone else is a 404.
    """
    invite = await get_own_invite(db, invite_id, user)
    already = await db.scalar(
        select(CampaignMember).where(
            CampaignMember.campaign_id == invite.campaign_id,
            CampaignMember.user_id == user.id,
        )
    )
    if already is None:
        db.add(CampaignMember(campaign_id=invite.campaign_id, user_id=user.id))
    await db.delete(invite)
    await db.commit()


@router.post(
    "/{invite_id}/decline",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Decline an invite",
    dependencies=[Depends(require_csrf)],
    responses=_NOT_FOUND,
)
async def decline_invite(
    invite_id: uuid.UUID, db: DbSession, user: CurrentUser
) -> None:
    """Decline an invite addressed to you (the invite is deleted).

    An invite that is unknown, expired, or addressed to someone else is a 404,
    so declining never confirms another user's invite exists.
    """
    invite = await get_own_invite(db, invite_id, user)
    await db.delete(invite)
    await db.commit()

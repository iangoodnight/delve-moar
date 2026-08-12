"""Campaign schemas -- owned collections that share books (ADR 0011/0014)."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.auth import Author, Username
from app.schemas.base import AppSchema


class CampaignCreate(AppSchema):
    """Payload to create a campaign."""

    name: str = Field(
        min_length=1,
        max_length=255,
        description="Display name for the campaign.",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="Optional longer description of the campaign.",
    )


class CampaignUpdate(AppSchema):
    """Payload to update a campaign. Only the provided fields are changed."""

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="New display name for the campaign.",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="New description for the campaign.",
    )


class CampaignSummary(AppSchema):
    """A campaign as shown in list views."""

    id: uuid.UUID = Field(description="Unique identifier for the campaign.")
    name: str = Field(description="Display name of the campaign.")
    description: str | None = Field(description="Longer description, if any.")
    owner: Author = Field(
        description="Public author projection of the campaign's owner."
    )
    role: Literal["owner", "member"] = Field(
        description="The viewer's relationship to this campaign."
    )
    created_at: datetime = Field(description="When the campaign was created.")
    updated_at: datetime = Field(
        description="When the campaign was last updated."
    )


class CampaignDetail(CampaignSummary):
    """A single campaign with its member and enabled-book counts."""

    member_count: int = Field(
        description="Number of members, excluding the owner."
    )
    book_count: int = Field(
        description="Number of books enabled on the campaign."
    )


class CampaignMemberSummary(AppSchema):
    """A member of a campaign, as shown in the roster."""

    user: Author = Field(description="Public author projection of the member.")
    joined_at: datetime = Field(
        description="When the member joined (accepted their invite)."
    )


class CampaignInviteCreate(AppSchema):
    """Payload to invite a user to a campaign by their public handle.

    Invites go by handle, never email: the username is the public identity
    (#185), so this never discloses which private email addresses exist.
    """

    handle: Username


class CampaignInviteSummary(AppSchema):
    """A pending invite, as the campaign owner sees it.

    Carries the invitee's public handle only -- never their email or id.
    """

    id: uuid.UUID = Field(description="Unique identifier for the invite.")
    campaign_id: uuid.UUID = Field(
        description="The campaign the invite is for."
    )
    invitee: Author = Field(
        description="Public author projection of the invited user."
    )
    expires_at: datetime = Field(
        description="When the invite lapses if not accepted."
    )
    created_at: datetime = Field(description="When the invite was created.")


class MyCampaignInvite(AppSchema):
    """A pending invite addressed to the current user.

    Shows the campaign and its owner's public handle so the invitee knows who
    invited them and to what; no data about other members is exposed.
    """

    id: uuid.UUID = Field(description="Unique identifier for the invite.")
    campaign_id: uuid.UUID = Field(
        description="The campaign the invite is for."
    )
    campaign_name: str = Field(description="Name of the campaign.")
    owner: Author = Field(
        description="Public author projection of the campaign's owner."
    )
    expires_at: datetime = Field(
        description="When the invite lapses if not accepted."
    )
    created_at: datetime = Field(description="When the invite was created.")

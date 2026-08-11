"""Campaign schemas -- owned collections that share books (ADR 0011/0014)."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.auth import Author
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

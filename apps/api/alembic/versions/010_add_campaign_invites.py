"""Add campaign invites (#176).

Revision ID: 010
Revises: 009
Create Date: 2026-08-12

Adds ``campaign_invites``: a pending invitation for a user to join a campaign.
Kept separate from ``campaign_members`` on purpose -- an invite grants nothing
until it is accepted, and only accepting moves a row into ``campaign_members``
(the table the authz read rule reads), so a pending invite can never leak
access. Addressed by the invitee's resolved account (owner-only invite by
public handle, #185), unique per (campaign, invitee), and expiring after a TTL.

The table is new and starts empty, so the NOT NULL columns apply to no rows.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "010"
down_revision: str | None = "009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "campaign_invites",
        sa.Column(
            "id",
            sa.Uuid(native_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "campaign_id",
            sa.Uuid(native_uuid=True),
            sa.ForeignKey("campaigns.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "invitee_user_id",
            sa.Uuid(native_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "campaign_id",
            "invitee_user_id",
            name="uq_campaign_invites_campaign_invitee",
        ),
    )
    op.create_index(
        "ix_campaign_invites_campaign_id", "campaign_invites", ["campaign_id"]
    )
    op.create_index(
        "ix_campaign_invites_invitee_user_id",
        "campaign_invites",
        ["invitee_user_id"],
    )


def downgrade() -> None:
    op.drop_table("campaign_invites")

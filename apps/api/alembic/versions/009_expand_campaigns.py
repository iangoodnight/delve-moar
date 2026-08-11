"""Expand campaigns into an owned entity + membership + enabled books (#176).

Revision ID: 009
Revises: 008
Create Date: 2026-08-11

Turns the migration-001 campaigns stub into a real entity: an ``owner_id``
(the controlling DM), an optional ``description``, and a relaxed nullable
``slug`` (campaigns are addressed by id, like user books, and a globally
unique slug would collide across users). Adds ``campaign_members`` (the
invited readers) and ``campaign_books`` (the books a campaign shares with
those members, per ADR 0014).

The campaigns table has never had endpoints, so it is empty: the NOT NULL
``owner_id`` and the slug relaxation apply to a table with no rows.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "009"
down_revision: str | None = "008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "campaigns",
        sa.Column(
            "owner_id",
            sa.Uuid(native_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    op.create_index("ix_campaigns_owner_id", "campaigns", ["owner_id"])
    op.add_column(
        "campaigns", sa.Column("description", sa.Text(), nullable=True)
    )
    op.alter_column(
        "campaigns",
        "slug",
        existing_type=sa.String(255),
        nullable=True,
        existing_nullable=False,
    )

    op.create_table(
        "campaign_members",
        sa.Column(
            "campaign_id",
            sa.Uuid(native_uuid=True),
            sa.ForeignKey("campaigns.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(native_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_campaign_members_user_id", "campaign_members", ["user_id"]
    )

    op.create_table(
        "campaign_books",
        sa.Column(
            "campaign_id",
            sa.Uuid(native_uuid=True),
            sa.ForeignKey("campaigns.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "book_id",
            sa.Uuid(native_uuid=True),
            sa.ForeignKey("books.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )
    op.create_index("ix_campaign_books_book_id", "campaign_books", ["book_id"])


def downgrade() -> None:
    op.drop_table("campaign_books")
    op.drop_table("campaign_members")
    op.alter_column(
        "campaigns",
        "slug",
        existing_type=sa.String(255),
        nullable=False,
        existing_nullable=True,
    )
    op.drop_column("campaigns", "description")
    op.drop_index("ix_campaigns_owner_id", table_name="campaigns")
    op.drop_column("campaigns", "owner_id")

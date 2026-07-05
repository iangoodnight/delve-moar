"""Add users.username -- the public account identity.

Revision ID: 005
Revises: 004
Create Date: 2026-06-11

Adds ``username`` to ``users`` (#185). Username is the public handle shown
when homebrew is published; email stays private (owner-only). Auth is still
dev-only at this point, so the column lands ``NOT NULL`` with no production
backfill to worry about.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("username", sa.String(30), nullable=False),
    )
    op.create_unique_constraint("uq_users_username", "users", ["username"])


def downgrade() -> None:
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.drop_column("users", "username")

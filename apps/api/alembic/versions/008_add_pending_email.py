"""Add users.pending_email -- staged address for change-email (#175).

Revision ID: 008
Revises: 007
Create Date: 2026-07-08

A change-email request stores the requested address in ``pending_email``
and emails a confirmation link there; the live ``email`` swaps to it only
once that link is confirmed, so a mistyped address never captures the
account. Nullable and non-unique -- it is transient intent, and uniqueness
is enforced on swap by the existing ``users.email`` unique constraint.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "008"
down_revision: str | None = "007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("pending_email", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "pending_email")

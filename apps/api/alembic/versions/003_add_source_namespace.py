"""Add source_namespace to catalog tables.

Revision ID: 003
Revises: 002
Create Date: 2026-04-09

Replaces the per-slug UNIQUE constraint with a composite
UNIQUE(slug, source_namespace) so that:

  - SRD versions can coexist:   srd-5.1 vs srd-2024 can both have
    slug "red-dragon" without conflict.
  - Homebrew can shadow SRD:    a user's "red-dragon" lives under
    "user:{user_id}" and never conflicts with "srd-5.1".

source_namespace values:
  "srd-5.1"          — Systems Reference Document 5.1 (2016 / CC BY 4.0)
  "srd-2024"         — future 2024 ruleset (not yet seeded)
  "user:{user_id}"   — per-user homebrew content (Phase 1c+)
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLES = ("monsters", "spells", "items")


def upgrade() -> None:
    for table in _TABLES:
        op.add_column(
            table,
            sa.Column(
                "source_namespace",
                sa.String(50),
                nullable=False,
                server_default="srd-5.1",
            ),
        )
        # Remove server_default after backfill — explicit values going forward.
        op.alter_column(table, "source_namespace", server_default=None)

        op.drop_constraint(f"uq_{table}_slug", table)
        op.create_unique_constraint(
            f"uq_{table}_slug_namespace",
            table,
            ["slug", "source_namespace"],
        )


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.drop_constraint(f"uq_{table}_slug_namespace", table)
        op.create_unique_constraint(f"uq_{table}_slug", table, ["slug"])
        op.drop_column(table, "source_namespace")

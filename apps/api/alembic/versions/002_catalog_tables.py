"""Catalog tables — monsters, spells, and items.

Revision ID: 002
Revises: 001
Create Date: 2026-04-09

Each table follows the same pattern:
  - Promoted scalar columns for filterable fields (indexed)
  - ``content`` JSONB stores the full source payload without lossy transforms
  - ``content_source`` JSONB stores license and attribution metadata
  - GIN index on ``content`` with jsonb_path_ops for future full-text search

SRD content carries:
  content_source = {
      "type": "srd",
      "license": "CC BY 4.0",
      "license_url": "https://creativecommons.org/licenses/by/4.0/",
      "attribution":
        "Wizards of the Coast LLC — Systems Reference Document 5.1",
      "data_provider": "5e-bits/5e-database",
      "data_provider_url": "https://github.com/5e-bits/5e-database"
  }
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── monsters ─────────────────────────────────────────────────────────────
    op.create_table(
        "monsters",
        sa.Column(
            "id",
            sa.Uuid(native_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("monster_type", sa.String(100), nullable=True),
        # CR stored as NUMERIC: "1/4" → 0.250, "1/2" → 0.500, "30" → 30.000.
        # Display formatting is the API layer's responsibility.
        sa.Column(
            "challenge_rating", sa.Numeric(precision=6, scale=3), nullable=True
        ),
        sa.Column("content", JSONB(), nullable=False),
        sa.Column("content_source", JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_monsters_slug"),
    )
    op.create_index("ix_monsters_monster_type", "monsters", ["monster_type"])
    op.create_index(
        "ix_monsters_challenge_rating", "monsters", ["challenge_rating"]
    )
    op.create_index(
        "ix_monsters_content_gin",
        "monsters",
        ["content"],
        postgresql_using="gin",
        postgresql_ops={"content": "jsonb_path_ops"},
    )

    # ── spells ────────────────────────────────────────────────────────────────
    op.create_table(
        "spells",
        sa.Column(
            "id",
            sa.Uuid(native_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        # 0 = cantrip, 1-9 = spell level. Display strings produced at API layer.
        sa.Column("level", sa.SmallInteger(), nullable=True),
        sa.Column("school", sa.String(100), nullable=True),
        sa.Column("content", JSONB(), nullable=False),
        sa.Column("content_source", JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_spells_slug"),
    )
    op.create_index("ix_spells_level", "spells", ["level"])
    op.create_index("ix_spells_school", "spells", ["school"])
    op.create_index(
        "ix_spells_content_gin",
        "spells",
        ["content"],
        postgresql_using="gin",
        postgresql_ops={"content": "jsonb_path_ops"},
    )

    # ── items ─────────────────────────────────────────────────────────────────
    op.create_table(
        "items",
        sa.Column(
            "id",
            sa.Uuid(native_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        # "weapon", "armor", "adventuring-gear", "magic-item", etc.
        sa.Column("item_category", sa.String(100), nullable=True),
        # NULL for mundane equipment; "common"…"legendary" for magic items.
        sa.Column("rarity", sa.String(50), nullable=True),
        sa.Column("content", JSONB(), nullable=False),
        sa.Column("content_source", JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_items_slug"),
    )
    op.create_index("ix_items_item_category", "items", ["item_category"])
    op.create_index("ix_items_rarity", "items", ["rarity"])
    op.create_index(
        "ix_items_content_gin",
        "items",
        ["content"],
        postgresql_using="gin",
        postgresql_ops={"content": "jsonb_path_ops"},
    )


def downgrade() -> None:
    op.drop_index(
        "ix_items_content_gin", table_name="items", postgresql_using="gin"
    )
    op.drop_index("ix_items_rarity", table_name="items")
    op.drop_index("ix_items_item_category", table_name="items")
    op.drop_table("items")

    op.drop_index(
        "ix_spells_content_gin", table_name="spells", postgresql_using="gin"
    )
    op.drop_index("ix_spells_school", table_name="spells")
    op.drop_index("ix_spells_level", table_name="spells")
    op.drop_table("spells")

    op.drop_index(
        "ix_monsters_content_gin", table_name="monsters", postgresql_using="gin"
    )
    op.drop_index("ix_monsters_challenge_rating", table_name="monsters")
    op.drop_index("ix_monsters_monster_type", table_name="monsters")
    op.drop_table("monsters")

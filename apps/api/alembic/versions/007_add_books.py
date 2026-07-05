"""Add books -- content collections (ADR 0014).

Revision ID: 007
Revises: 006
Create Date: 2026-06-17

A book is an owned collection of content (monsters, spells, items),
many-to-many to each content type. Per ADR 0014:

  books          -- id, owner_id (NULL for system books), name, slug
                    (stable handle for system books, NULL for user books),
                    description, is_public, is_system.
  book_monsters  -- (book_id, monster_id) membership, cascade both ways.
  book_spells    -- (book_id, spell_id) membership.
  book_items     -- (book_id, item_id) membership.

Backfill:
  - Create the system SRD book (slug "srd-5.1", public, read-only) and
    add every srd-5.1 content row to it.
  - Give each existing user a default "My Collection" book.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "007"
down_revision: str | None = "006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SRD_BOOK_SLUG = "srd-5.1"
_SRD_NAMESPACE = "srd-5.1"
_DEFAULT_BOOK_NAME = "My Collection"

# (join table, content table, content fk column) for the three resources.
_JOINS = (
    ("book_monsters", "monsters", "monster_id"),
    ("book_spells", "spells", "spell_id"),
    ("book_items", "items", "item_id"),
)


def upgrade() -> None:
    op.create_table(
        "books",
        sa.Column(
            "id",
            sa.Uuid(native_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("owner_id", sa.Uuid(native_uuid=True), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "is_public",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column(
            "is_system",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
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
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name="fk_books_owner_id",
            ondelete="CASCADE",
        ),
        # Plain UNIQUE leaves NULL slugs distinct, so user books (slug NULL)
        # never collide; only named system books carry a slug.
        sa.UniqueConstraint("slug", name="uq_books_slug"),
    )
    op.create_index("ix_books_owner_id", "books", ["owner_id"])

    for join_table, content_table, fk_col in _JOINS:
        op.create_table(
            join_table,
            sa.Column("book_id", sa.Uuid(native_uuid=True), nullable=False),
            sa.Column(fk_col, sa.Uuid(native_uuid=True), nullable=False),
            sa.Column(
                "created_at",
                sa.TIMESTAMP(timezone=True),
                server_default=sa.text("NOW()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("book_id", fk_col),
            sa.ForeignKeyConstraint(
                ["book_id"],
                ["books.id"],
                name=f"fk_{join_table}_book_id",
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                [fk_col],
                [f"{content_table}.id"],
                name=f"fk_{join_table}_{fk_col}",
                ondelete="CASCADE",
            ),
        )
        # Reverse lookup: "which books is this content in?"
        op.create_index(f"ix_{join_table}_{fk_col}", join_table, [fk_col])

    _backfill()


def _backfill() -> None:
    """Seed the SRD system book and per-user default books."""
    op.execute(
        sa.text(
            "INSERT INTO books (name, slug, description, is_public, is_system) "
            "VALUES (:name, :slug, :description, true, true)"
        ).bindparams(
            name="SRD 5.1",
            slug=_SRD_BOOK_SLUG,
            description=(
                "The System Reference Document 5.1 catalog "
                "(CC BY 4.0). Read-only."
            ),
        )
    )

    # Interpolated identifiers come from _JOINS (constants), not user input.
    for join_table, content_table, fk_col in _JOINS:
        op.execute(
            sa.text(
                f"INSERT INTO {join_table} (book_id, {fk_col}) "  # noqa: S608
                "SELECT (SELECT id FROM books WHERE slug = :slug), c.id "
                f"FROM {content_table} c "
                "WHERE c.source_namespace = :namespace"
            ).bindparams(slug=_SRD_BOOK_SLUG, namespace=_SRD_NAMESPACE)
        )

    op.execute(
        sa.text(
            "INSERT INTO books (owner_id, name, is_public, is_system) "
            "SELECT u.id, :name, false, false FROM users u"
        ).bindparams(name=_DEFAULT_BOOK_NAME)
    )


def downgrade() -> None:
    for join_table, _content_table, fk_col in _JOINS:
        op.drop_index(f"ix_{join_table}_{fk_col}", table_name=join_table)
        op.drop_table(join_table)
    op.drop_index("ix_books_owner_id", table_name="books")
    op.drop_table("books")

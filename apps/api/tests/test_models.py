"""Smoke tests for ORM models.

Validates that all models are importable, carry the expected table name,
and expose the expected column names — without requiring a live DB connection.
"""

from app.models import Campaign, Item, Monster, Spell


def test_campaign_tablename() -> None:
    assert Campaign.__tablename__ == "campaigns"


def test_campaign_columns() -> None:
    cols = {c.key for c in Campaign.__table__.columns}
    assert cols == {"id", "name", "slug", "created_at", "updated_at"}


def test_monster_tablename() -> None:
    assert Monster.__tablename__ == "monsters"


def test_monster_columns() -> None:
    cols = {c.key for c in Monster.__table__.columns}
    assert cols == {
        "id",
        "slug",
        "source_namespace",
        "name",
        "monster_type",
        "challenge_rating",
        "content",
        "content_source",
        "created_at",
        "updated_at",
    }


def test_spell_tablename() -> None:
    assert Spell.__tablename__ == "spells"


def test_spell_columns() -> None:
    cols = {c.key for c in Spell.__table__.columns}
    assert cols == {
        "id",
        "slug",
        "source_namespace",
        "name",
        "level",
        "school",
        "content",
        "content_source",
        "created_at",
        "updated_at",
    }


def test_item_tablename() -> None:
    assert Item.__tablename__ == "items"


def test_item_columns() -> None:
    cols = {c.key for c in Item.__table__.columns}
    assert cols == {
        "id",
        "slug",
        "source_namespace",
        "name",
        "item_category",
        "rarity",
        "content",
        "content_source",
        "created_at",
        "updated_at",
    }


def test_campaign_slug_is_unique() -> None:
    """campaigns.slug has a single-column UNIQUE constraint."""
    slug_col = Campaign.__table__.columns["slug"]
    assert slug_col.unique


def test_catalog_slugs_have_source_namespace() -> None:
    """Catalog tables carry source_namespace for composite uniqueness."""
    for model in (Monster, Spell, Item):
        cols = {c.key for c in model.__table__.columns}
        assert "source_namespace" in cols, (
            f"{model.__tablename__} missing source_namespace"
        )

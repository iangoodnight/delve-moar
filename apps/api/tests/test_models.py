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
        "name",
        "item_category",
        "rarity",
        "content",
        "content_source",
        "created_at",
        "updated_at",
    }


def test_slug_columns_are_unique() -> None:
    """All catalog tables enforce slug uniqueness at the DB level."""
    for model in (Campaign, Monster, Spell, Item):
        slug_col = model.__table__.columns["slug"]
        assert slug_col.unique, f"{model.__tablename__}.slug should be UNIQUE"

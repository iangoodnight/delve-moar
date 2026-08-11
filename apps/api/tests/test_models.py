"""Smoke tests for ORM models.

Validates that all models are importable, carry the expected table name,
and expose the expected column names — without requiring a live DB connection.
"""

from app.models import (
    Campaign,
    EmailToken,
    EmailTokenPurpose,
    Item,
    Monster,
    Session,
    Spell,
    User,
)


def test_campaign_tablename() -> None:
    assert Campaign.__tablename__ == "campaigns"


def test_campaign_columns() -> None:
    cols = {c.key for c in Campaign.__table__.columns}
    assert cols == {
        "id",
        "owner_id",
        "name",
        "slug",
        "description",
        "created_at",
        "updated_at",
    }


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


def test_user_tablename() -> None:
    assert User.__tablename__ == "users"


def test_user_columns() -> None:
    cols = {c.key for c in User.__table__.columns}
    assert cols == {
        "id",
        "username",
        "email",
        "password_hash",
        "email_verified_at",
        "pending_email",
        "created_at",
        "updated_at",
    }


def test_user_email_is_unique() -> None:
    """users.email has a single-column UNIQUE constraint."""
    assert User.__table__.columns["email"].unique


def test_user_username_is_unique() -> None:
    """users.username has a single-column UNIQUE constraint."""
    assert User.__table__.columns["username"].unique


def test_session_tablename() -> None:
    assert Session.__tablename__ == "sessions"


def test_session_columns() -> None:
    cols = {c.key for c in Session.__table__.columns}
    assert cols == {
        "id",
        "user_id",
        "token_hash",
        "created_at",
        "expires_at",
        "last_used_at",
    }


def test_session_token_hash_is_unique() -> None:
    """sessions.token_hash has a single-column UNIQUE constraint."""
    assert Session.__table__.columns["token_hash"].unique


def test_session_user_fk_cascades() -> None:
    """sessions.user_id references users.id and cascades on delete."""
    fk = next(iter(Session.__table__.columns["user_id"].foreign_keys))
    assert fk.column.table.name == "users"
    assert fk.ondelete == "CASCADE"


def test_email_token_tablename() -> None:
    assert EmailToken.__tablename__ == "email_tokens"


def test_email_token_columns() -> None:
    cols = {c.key for c in EmailToken.__table__.columns}
    assert cols == {
        "id",
        "user_id",
        "token_hash",
        "purpose",
        "expires_at",
        "created_at",
    }


def test_email_token_token_hash_is_unique() -> None:
    """email_tokens.token_hash has a single-column UNIQUE constraint."""
    assert EmailToken.__table__.columns["token_hash"].unique


def test_email_token_user_fk_cascades() -> None:
    """email_tokens.user_id references users.id and cascades on delete."""
    fk = next(iter(EmailToken.__table__.columns["user_id"].foreign_keys))
    assert fk.column.table.name == "users"
    assert fk.ondelete == "CASCADE"


def test_email_token_purpose_values() -> None:
    """The purpose enum carries the two #171 lifecycle flows."""
    assert EmailTokenPurpose.EMAIL_VERIFICATION.value == "email_verification"
    assert EmailTokenPurpose.PASSWORD_RESET.value == "password_reset"


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

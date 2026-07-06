"""Unit tests for the database engine and session-factory initialization."""

from unittest.mock import patch

import app.db as db
from app.config import settings


def test_init_db_configures_connection_liveness() -> None:
    """init_db must pass the pool-liveness options to the engine (#303).

    A pooled connection can be closed server-side while idle (the Fly
    ``.flycast`` proxy) or by a DB restart, so the engine needs pre-ping to
    detect and replace it instead of surfacing asyncpg "connection is closed".
    """
    original_factory = db._factory
    try:
        with patch.object(db, "create_async_engine") as mock_create:
            db.init_db(
                "postgresql+asyncpg://u:p@localhost:5432/db",
                pool_pre_ping=True,
                pool_recycle_seconds=123,
            )
        mock_create.assert_called_once()
        kwargs = mock_create.call_args.kwargs
        assert kwargs["pool_pre_ping"] is True
        assert kwargs["pool_recycle"] == 123
    finally:
        db._factory = original_factory


def test_pool_defaults_keep_pre_ping_on() -> None:
    """The shipped defaults keep pre-ping on so production stays protected."""
    assert settings.db_pool_pre_ping is True
    assert settings.db_pool_recycle_seconds > 0

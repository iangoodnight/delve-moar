"""Shared pytest fixtures."""

import asyncio
from collections.abc import AsyncGenerator
from typing import Any

import asyncpg
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.db import get_session
from app.exceptions import AppError, register_exception_handlers
from app.main import app
from app.models.base import Base
from app.routers import health

# Full SRD content_source shape, mirroring the seed pipeline's
# SRD_CONTENT_SOURCE constant in scripts/seed_srd.py. Used as a default
# in _make_X fixture helpers across the resource test modules so the
# Pydantic ContentSource model validates without missing-field errors.
SRD_CONTENT_SOURCE_FIXTURE: dict[str, Any] = {
    "type": "srd",
    "license": "CC BY 4.0",
    "license_url": "https://creativecommons.org/licenses/by/4.0/",
    "attribution": "Wizards of the Coast LLC — Systems Reference Document 5.1",
    "data_provider": "5e-bits/5e-database",
    "data_provider_url": "https://github.com/5e-bits/5e-database",
}


# Minimal valid SrdSpellContent payload. All required fields are present
# with reasonable defaults; tests spread + override per scenario.
MINIMAL_SPELL_CONTENT_FIXTURE: dict[str, Any] = {
    "name": "Fireball",
    "level": 3,
    "school": {"index": "evocation", "name": "Evocation"},
    "casting_time": "1 action",
    "range": "150 feet",
    "components": ["V", "S", "M"],
    "duration": "Instantaneous",
    "concentration": False,
    "desc": ["A bright streak flashes from your pointing finger."],
}


# Minimal valid SrdMonsterContent payload. All required fields are present
# with defaults; tests can spread + override per scenario. Mirrors the
# shape produced by the seed pipeline for the smallest possible monster.
MINIMAL_MONSTER_CONTENT_FIXTURE: dict[str, Any] = {
    "name": "Goblin",
    "size": "Small",
    "type": "humanoid",
    "alignment": "neutral evil",
    "armor_class": [{"type": "natural", "value": 12}],
    "hit_points": 7,
    "hit_dice": "2d6",
    "speed": {"walk": "30 ft."},
    "strength": 8,
    "dexterity": 14,
    "constitution": 10,
    "intelligence": 10,
    "wisdom": 8,
    "charisma": 8,
    "proficiencies": [],
    "damage_immunities": [],
    "damage_resistances": [],
    "damage_vulnerabilities": [],
    "condition_immunities": [],
    "senses": {"passive_perception": 9},
    "languages": "Common, Goblin",
    "challenge_rating": 0.25,
    "xp": 50,
    "actions": [],
    "special_abilities": [],
}


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client wired to the real app instance."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
async def error_test_client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client wired to a minimal app with test-only error routes.

    Used to exercise exception handlers without touching the real app.
    """
    test_app = FastAPI()
    register_exception_handlers(test_app)
    test_app.include_router(health.router)

    @test_app.get("/test-app-error")
    async def _raise_app_error() -> None:
        raise AppError(
            status=418,
            developer_message="This is a test AppError.",
            user_message="Something went wrong.",
            error_code="TEST_ERROR",
            more_info="http://localhost:8000/docs",
        )

    @test_app.get("/test-validation-error")
    async def _trigger_validation_error(value: int) -> dict[str, int]:
        return {"value": value}

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as ac:
        yield ac


# ── Real-Postgres test fixtures ──────────────────────────────────────────────
# Auth correctness lives in DB-enforced invariants (unique email, session
# expiry, revocation) that a mocked session cannot exercise. These fixtures
# run against a dedicated "<db>_test" database (never the dev database) and
# isolate each test inside a rolled-back transaction. Existing mock-session
# route tests are unaffected.


def _test_database_url() -> str:
    """Derive a dedicated ``<db>_test`` URL from the configured DATABASE_URL."""
    url = make_url(settings.database_url)
    test_url = url.set(database=f"{url.database}_test")
    return test_url.render_as_string(hide_password=False)


async def _ensure_test_database() -> None:
    """Create the ``<db>_test`` database if it does not already exist."""
    url = make_url(settings.database_url)
    test_db = f"{url.database}_test"
    conn = await asyncpg.connect(
        host=url.host,
        port=url.port,
        user=url.username,
        password=url.password,
        database="postgres",
    )
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", test_db
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{test_db}"')
    finally:
        await conn.close()


@pytest.fixture(scope="session")
def test_schema() -> str:
    """Ensure the test database exists and carries the current schema.

    Runs once per session on a throwaway event loop (``NullPool`` so no
    connection is cached across loops). Schema comes from model metadata,
    not migrations -- migrations are validated separately via ``alembic``.
    Returns the test database URL.
    """
    test_url = _test_database_url()

    async def _create() -> None:
        await _ensure_test_database()
        engine = create_async_engine(test_url, poolclass=NullPool)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    asyncio.run(_create())
    return test_url


@pytest.fixture
async def db_session(test_schema: str) -> AsyncGenerator[AsyncSession, None]:
    """A transactional ``AsyncSession`` rolled back after each test.

    Each test runs inside an outer transaction on a dedicated connection;
    the session joins it via SAVEPOINTs (``create_savepoint``) so the app's
    own commits are undone by the final rollback. This isolates tests from
    one another and guarantees nothing is persisted.
    """
    engine = create_async_engine(test_schema, poolclass=NullPool)
    connection = await engine.connect()
    transaction = await connection.begin()
    session = AsyncSession(
        bind=connection,
        join_transaction_mode="create_savepoint",
        expire_on_commit=False,
    )
    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()


@pytest.fixture
async def db_client(
    db_session: AsyncSession,
) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client whose ``get_session`` dependency uses the test transaction.

    Wires the real app to the rolled-back ``db_session`` so endpoint tests
    exercise the full request path against a real database.
    """

    async def _get_test_session() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_session] = _get_test_session
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac
    finally:
        app.dependency_overrides.pop(get_session, None)

"""Shared pytest fixtures."""

from collections.abc import AsyncGenerator
from typing import Any

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.exceptions import AppError, register_exception_handlers
from app.main import app
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

"""Shared pytest fixtures."""

from collections.abc import AsyncGenerator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.exceptions import AppError, register_exception_handlers
from app.main import app
from app.routers import health


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

"""Tests for custom exception handlers and get_or_404 helper."""

from pathlib import Path

import pytest
from httpx import AsyncClient
from starlette.requests import Request

from app.config import Settings
from app.exceptions import AppError, _handle_app_error, get_or_404


def _bare_request() -> Request:
    """Build a minimal request; the AppError handler does not read it."""
    return Request(
        {"type": "http", "method": "GET", "path": "/", "headers": []}
    )


async def test_app_error_handler_returns_correct_shape(
    error_test_client: AsyncClient,
) -> None:
    """AppError raised in a route produces a correctly shaped JSON response."""
    response = await error_test_client.get("/test-app-error")
    assert response.status_code == 418
    body = response.json()
    assert body["status"] == 418
    assert "developerMessage" in body
    assert "userMessage" in body
    assert "errorCode" in body
    assert "moreInfo" in body


async def test_app_error_handler_camel_case(
    error_test_client: AsyncClient,
) -> None:
    """AppError response fields are camelCase, not snake_case."""
    response = await error_test_client.get("/test-app-error")
    body = response.json()
    assert "developer_message" not in body
    assert "user_message" not in body
    assert "error_code" not in body
    assert "more_info" not in body


async def test_app_error_handler_propagates_custom_headers() -> None:
    """AppError.headers are written onto the response (e.g. Retry-After)."""
    exc = AppError(
        status=429,
        developer_message="Rate limit exceeded.",
        user_message="Too many attempts.",
        error_code="RATE_LIMITED",
        more_info="http://test/docs",
        headers={"Retry-After": "30"},
    )
    response = await _handle_app_error(_bare_request(), exc)
    assert response.status_code == 429
    assert response.headers["Retry-After"] == "30"


async def test_validation_error_handler_returns_correct_shape(
    error_test_client: AsyncClient,
) -> None:
    """Invalid query params produce a 422 in the standard ErrorResponse."""
    response = await error_test_client.get("/test-validation-error")
    assert response.status_code == 422
    body = response.json()
    assert body["status"] == 422
    assert body["errorCode"] == "VALIDATION_ERROR"
    assert "developerMessage" in body
    assert "userMessage" in body
    assert "moreInfo" in body


async def test_validation_error_no_fastapi_default_shape(
    error_test_client: AsyncClient,
) -> None:
    """422 response does not use FastAPI's default detail array shape."""
    response = await error_test_client.get("/test-validation-error")
    assert "detail" not in response.json()


def test_get_or_404_returns_value() -> None:
    """get_or_404 passes through a non-None value unchanged."""
    assert get_or_404("found", resource="thing", identifier="x") == "found"


def test_get_or_404_raises_app_error_on_none() -> None:
    """get_or_404 raises AppError with status 404 when result is None."""
    with pytest.raises(AppError) as exc_info:
        get_or_404(None, resource="monster", identifier="tarrasque")
    assert exc_info.value.status == 404
    assert exc_info.value.error_code == "RESOURCE_NOT_FOUND"


def test_env_example_matches_settings() -> None:
    """Every Settings field has a corresponding entry in .env.example.

    Prevents .env.example from drifting out of sync when new settings are
    added. Only checks Settings -> .env.example direction; extra keys in
    .env.example (e.g. POSTGRES_USER for Docker Compose) are allowed.
    """
    env_example = Path(__file__).parents[3] / ".env.example"
    env_keys = {
        line.split("=")[0].strip().lower()
        for line in env_example.read_text().splitlines()
        if line.strip() and not line.startswith("#")
    }
    settings_keys = set(Settings.model_fields.keys())
    missing = settings_keys - env_keys
    assert not missing, f"Settings fields missing from .env.example: {missing}"

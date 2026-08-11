"""CORS policy tests.

The API sends credentials (session + CSRF cookies), so the middleware must
advertise an explicit, least-privilege policy rather than "*". Allowed
origins stay configurable via CORS_ALLOWED_ORIGINS (the default here is the
local web origin); a "*" origin is rejected outright.
"""

import pytest
from httpx import AsyncClient
from pydantic import ValidationError

from app.config import Settings

ALLOWED_ORIGIN = "http://localhost:5173"


async def test_preflight_allows_configured_origin(client: AsyncClient) -> None:
    response = await client.options(
        "/health",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-csrf-token",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert response.headers["access-control-allow-credentials"] == "true"


async def test_preflight_advertises_narrowed_methods_and_headers(
    client: AsyncClient,
) -> None:
    response = await client.options(
        "/health",
        headers={
            "Origin": ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-csrf-token",
        },
    )
    methods = response.headers["access-control-allow-methods"].upper()
    assert "*" not in methods
    for method in ("GET", "POST", "PUT", "PATCH", "DELETE"):
        assert method in methods

    headers = response.headers["access-control-allow-headers"].lower()
    assert "*" not in headers
    assert "content-type" in headers
    assert "x-csrf-token" in headers


async def test_preflight_rejects_unconfigured_origin(
    client: AsyncClient,
) -> None:
    response = await client.options(
        "/health",
        headers={
            "Origin": "https://evil.example.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


async def test_actual_request_echoes_origin_and_credentials(
    client: AsyncClient,
) -> None:
    response = await client.get("/health", headers={"Origin": ALLOWED_ORIGIN})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert response.headers["access-control-allow-credentials"] == "true"


def test_wildcard_cors_origin_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # A "*" origin is incompatible with credentialed CORS and must fail fast.
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "*")
    with pytest.raises(ValidationError, match="CORS_ALLOWED_ORIGINS"):
        Settings()

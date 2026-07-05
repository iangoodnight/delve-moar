"""Tests for the IP-based rate limiter on auth endpoints.

``client_ip`` is unit-tested against synthetic requests; the login and
signup limits are exercised end-to-end through ``db_client`` (the real app
wired to a rolled-back transaction). The autouse ``_reset_rate_limits``
fixture in conftest clears counters before each test.
"""

import pytest
from httpx import AsyncClient
from starlette.requests import Request

from app.config import settings
from app.rate_limit import (
    _build_storage,
    client_ip,
    reset_rate_limits,
)

SIGNUP = "/v1/auth/signup"
LOGIN = "/v1/auth/login"

PASSWORD = "hunter2hunter"


def _request(
    headers: dict[str, str] | None = None,
    client: tuple[str, int] | None = ("127.0.0.1", 1234),
) -> Request:
    """Build a minimal Starlette request for ``client_ip`` unit tests."""
    scope: dict[str, object] = {
        "type": "http",
        "method": "POST",
        "path": "/",
        "query_string": b"",
        "headers": [
            (key.lower().encode(), value.encode())
            for key, value in (headers or {}).items()
        ],
    }
    if client is not None:
        scope["client"] = client
    return Request(scope)


def test_client_ip_prefers_fly_header() -> None:
    request = _request(
        headers={
            "Fly-Client-IP": "203.0.113.7",
            "X-Forwarded-For": "5.5.5.5",
        },
        client=("10.0.0.1", 5000),
    )
    assert client_ip(request) == "203.0.113.7"


def test_client_ip_falls_back_to_forwarded_for_first_hop() -> None:
    request = _request(
        headers={"X-Forwarded-For": "1.2.3.4, 5.6.7.8"},
        client=("10.0.0.1", 5000),
    )
    assert client_ip(request) == "1.2.3.4"


def test_client_ip_falls_back_to_peer_address() -> None:
    request = _request(headers=None, client=("9.9.9.9", 4321))
    assert client_ip(request) == "9.9.9.9"


def test_client_ip_unknown_when_no_signal() -> None:
    request = _request(headers=None, client=None)
    assert client_ip(request) == "unknown"


def test_build_storage_rejects_sync_uri(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "rate_limit_storage_uri", "memory://")
    with pytest.raises(RuntimeError, match="async backend"):
        _build_storage()


async def test_login_is_rate_limited_with_retry_after(
    db_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_login", "2/minute")
    payload = {"identifier": "nobody@example.com", "password": PASSWORD}

    first = await db_client.post(LOGIN, json=payload)
    second = await db_client.post(LOGIN, json=payload)
    assert first.status_code == 401
    assert second.status_code == 401

    blocked = await db_client.post(LOGIN, json=payload)
    assert blocked.status_code == 429
    body = blocked.json()
    assert body["errorCode"] == "RATE_LIMITED"
    assert body["status"] == 429
    assert "userMessage" in body
    retry_after = blocked.headers["Retry-After"]
    assert int(retry_after) >= 1


async def test_rate_limit_resets_after_clear(
    db_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_login", "1/minute")
    payload = {"identifier": "nobody@example.com", "password": PASSWORD}

    assert (await db_client.post(LOGIN, json=payload)).status_code == 401
    assert (await db_client.post(LOGIN, json=payload)).status_code == 429

    await reset_rate_limits()

    # Budget restored: the next attempt is judged on credentials again.
    assert (await db_client.post(LOGIN, json=payload)).status_code == 401


async def test_disabled_toggle_bypasses_limiting(
    db_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_enabled", False)
    monkeypatch.setattr(settings, "rate_limit_login", "1/minute")
    payload = {"identifier": "nobody@example.com", "password": PASSWORD}

    for _ in range(3):
        resp = await db_client.post(LOGIN, json=payload)
        assert resp.status_code == 401  # never 429


async def test_signup_is_rate_limited(
    db_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_signup", "1/hour")

    first = await db_client.post(
        SIGNUP,
        json={
            "username": "ratedm",
            "email": "one@example.com",
            "password": PASSWORD,
        },
    )
    assert first.status_code == 201

    blocked = await db_client.post(
        SIGNUP,
        json={
            "username": "ratedmtwo",
            "email": "two@example.com",
            "password": PASSWORD,
        },
    )
    assert blocked.status_code == 429
    assert blocked.json()["errorCode"] == "RATE_LIMITED"

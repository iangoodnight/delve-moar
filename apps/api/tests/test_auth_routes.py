"""End-to-end tests for the auth endpoints over a real database.

Uses the ``db_client`` fixture (the real app wired to a rolled-back
transaction). httpx persists cookies on the client, so the session and
CSRF cookies set at signup/login carry into later requests automatically.
"""

import pytest
import sqlalchemy as sa
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.sessions import create_session, resolve_session
from app.config import settings
from app.models import Session, User

SIGNUP = "/v1/auth/signup"
LOGIN = "/v1/auth/login"
LOGOUT = "/v1/auth/logout"
ME = "/v1/auth/me"


def _csrf_header(client: AsyncClient) -> dict[str, str]:
    """Echo the readable CSRF cookie back as the double-submit header."""
    return {"X-CSRF-Token": client.cookies[settings.csrf_cookie_name]}


async def test_signup_creates_user_and_sets_cookies(
    db_client: AsyncClient,
) -> None:
    resp = await db_client.post(
        SIGNUP, json={"email": "New@Example.com", "password": "hunter2hunter"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "new@example.com"  # lowercased
    assert body["emailVerified"] is False
    assert "id" in body

    cookies = "; ".join(resp.headers.get_list("set-cookie")).lower()
    assert settings.session_cookie_name in cookies
    assert settings.csrf_cookie_name in cookies


async def test_session_cookie_is_httponly_csrf_is_not(
    db_client: AsyncClient,
) -> None:
    resp = await db_client.post(
        SIGNUP, json={"email": "flags@example.com", "password": "hunter2hunter"}
    )
    set_cookies = resp.headers.get_list("set-cookie")
    session_cookie = next(
        c for c in set_cookies if c.startswith(settings.session_cookie_name)
    )
    csrf_cookie = next(
        c for c in set_cookies if c.startswith(settings.csrf_cookie_name)
    )
    assert "httponly" in session_cookie.lower()
    assert "samesite=lax" in session_cookie.lower()
    assert "httponly" not in csrf_cookie.lower()


async def test_signup_duplicate_email_conflicts(
    db_client: AsyncClient,
) -> None:
    payload = {"email": "dupe@example.com", "password": "hunter2hunter"}
    first = await db_client.post(SIGNUP, json=payload)
    assert first.status_code == 201
    second = await db_client.post(SIGNUP, json=payload)
    assert second.status_code == 409
    assert second.json()["errorCode"] == "EMAIL_TAKEN"


async def test_signup_rejects_short_password(db_client: AsyncClient) -> None:
    resp = await db_client.post(
        SIGNUP, json={"email": "short@example.com", "password": "tiny"}
    )
    assert resp.status_code == 422


async def test_me_requires_authentication(db_client: AsyncClient) -> None:
    resp = await db_client.get(ME)
    assert resp.status_code == 401
    assert resp.json()["errorCode"] == "UNAUTHENTICATED"


async def test_me_returns_current_user_after_signup(
    db_client: AsyncClient,
) -> None:
    await db_client.post(
        SIGNUP, json={"email": "me@example.com", "password": "hunter2hunter"}
    )
    resp = await db_client.get(ME)
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"


async def test_login_succeeds_with_correct_password(
    db_client: AsyncClient,
) -> None:
    await db_client.post(
        SIGNUP, json={"email": "log@example.com", "password": "hunter2hunter"}
    )
    db_client.cookies.clear()  # drop the signup session

    resp = await db_client.post(
        LOGIN, json={"email": "LOG@example.com", "password": "hunter2hunter"}
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "log@example.com"
    me = await db_client.get(ME)
    assert me.status_code == 200


async def test_login_rejects_wrong_password(db_client: AsyncClient) -> None:
    await db_client.post(
        SIGNUP, json={"email": "wp@example.com", "password": "hunter2hunter"}
    )
    resp = await db_client.post(
        LOGIN, json={"email": "wp@example.com", "password": "wrongpassword"}
    )
    assert resp.status_code == 401
    assert resp.json()["errorCode"] == "INVALID_CREDENTIALS"


async def test_login_rejects_unknown_email(db_client: AsyncClient) -> None:
    resp = await db_client.post(
        LOGIN, json={"email": "ghost@example.com", "password": "hunter2hunter"}
    )
    assert resp.status_code == 401
    assert resp.json()["errorCode"] == "INVALID_CREDENTIALS"


async def test_logout_revokes_session_and_clears_cookies(
    db_client: AsyncClient,
) -> None:
    await db_client.post(
        SIGNUP, json={"email": "out@example.com", "password": "hunter2hunter"}
    )
    resp = await db_client.post(LOGOUT, headers=_csrf_header(db_client))
    assert resp.status_code == 204

    # Cookies cleared; a follow-up authenticated call is rejected.
    me = await db_client.get(ME)
    assert me.status_code == 401


async def test_logout_requires_csrf(db_client: AsyncClient) -> None:
    await db_client.post(
        SIGNUP, json={"email": "csrf@example.com", "password": "hunter2hunter"}
    )
    resp = await db_client.post(LOGOUT)  # no X-CSRF-Token header
    assert resp.status_code == 403
    assert resp.json()["errorCode"] == "CSRF_FAILED"


async def test_logout_everywhere_revokes_all_sessions(
    db_client: AsyncClient, db_session: AsyncSession
) -> None:
    await db_client.post(
        SIGNUP, json={"email": "all@example.com", "password": "hunter2hunter"}
    )
    user = await db_session.scalar(
        sa.select(User).where(User.email == "all@example.com")
    )
    assert user is not None
    # A second device's session for the same user.
    other_token = await create_session(db_session, user.id)

    resp = await db_client.post(
        f"{LOGOUT}?everywhere=true", headers=_csrf_header(db_client)
    )
    assert resp.status_code == 204

    remaining = await db_session.scalar(
        sa.select(sa.func.count()).select_from(Session)
    )
    assert remaining == 0
    assert await resolve_session(db_session, other_token) is None


async def test_login_upgrades_hash_when_params_change(
    db_client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await db_client.post(
        SIGNUP,
        json={"email": "rehash@example.com", "password": "hunter2hunter"},
    )
    user = await db_session.scalar(
        sa.select(User).where(User.email == "rehash@example.com")
    )
    assert user is not None
    old_hash = user.password_hash
    db_client.cookies.clear()

    # Simulate stronger argon2 params landing: the stored hash now needs an
    # upgrade, which login should perform transparently.
    monkeypatch.setattr("app.routers.auth.needs_rehash", lambda _hash: True)
    resp = await db_client.post(
        LOGIN, json={"email": "rehash@example.com", "password": "hunter2hunter"}
    )
    assert resp.status_code == 200

    await db_session.refresh(user)
    assert user.password_hash != old_hash

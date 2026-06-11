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
from app.schemas.auth import Author

SIGNUP = "/v1/auth/signup"
LOGIN = "/v1/auth/login"
LOGOUT = "/v1/auth/logout"
ME = "/v1/auth/me"

PASSWORD = "hunter2hunter"


def _signup(
    username: str, email: str, password: str = PASSWORD
) -> dict[str, str]:
    """Build a signup payload."""
    return {"username": username, "email": email, "password": password}


def _csrf_header(client: AsyncClient) -> dict[str, str]:
    """Echo the readable CSRF cookie back as the double-submit header."""
    return {"X-CSRF-Token": client.cookies[settings.csrf_cookie_name]}


async def test_signup_creates_user_and_sets_cookies(
    db_client: AsyncClient,
) -> None:
    resp = await db_client.post(
        SIGNUP, json=_signup("newdm", "New@Example.com")
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "newdm"
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
        SIGNUP, json=_signup("flagsdm", "flags@example.com")
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


async def test_signup_requires_username(db_client: AsyncClient) -> None:
    resp = await db_client.post(
        SIGNUP, json={"email": "nouser@example.com", "password": PASSWORD}
    )
    assert resp.status_code == 422


@pytest.mark.parametrize(
    "username",
    [
        "ab",  # too short
        "a" * 31,  # too long
        "CoolDM",  # uppercase rejected, not folded
        "has space",  # space not allowed
        "has@at",  # '@' not allowed (reserved for emails)
        "admin",  # reserved
        "delvemoar",  # reserved
    ],
)
async def test_signup_rejects_invalid_username(
    db_client: AsyncClient, username: str
) -> None:
    resp = await db_client.post(
        SIGNUP, json=_signup(username, "valid@example.com")
    )
    assert resp.status_code == 422


async def test_signup_duplicate_email_conflicts(
    db_client: AsyncClient,
) -> None:
    first = await db_client.post(
        SIGNUP, json=_signup("dmone", "dupe@example.com")
    )
    assert first.status_code == 201
    # Same email, different username -> the email constraint is the one hit.
    second = await db_client.post(
        SIGNUP, json=_signup("dmtwo", "dupe@example.com")
    )
    assert second.status_code == 409
    assert second.json()["errorCode"] == "EMAIL_TAKEN"


async def test_signup_duplicate_username_conflicts(
    db_client: AsyncClient,
) -> None:
    first = await db_client.post(
        SIGNUP, json=_signup("samedm", "one@example.com")
    )
    assert first.status_code == 201
    # Same username, different email -> the username constraint is the one hit.
    second = await db_client.post(
        SIGNUP, json=_signup("samedm", "two@example.com")
    )
    assert second.status_code == 409
    assert second.json()["errorCode"] == "USERNAME_TAKEN"


async def test_signup_rejects_short_password(db_client: AsyncClient) -> None:
    resp = await db_client.post(
        SIGNUP, json=_signup("shortpw", "short@example.com", password="tiny")
    )
    assert resp.status_code == 422


async def test_me_requires_authentication(db_client: AsyncClient) -> None:
    resp = await db_client.get(ME)
    assert resp.status_code == 401
    assert resp.json()["errorCode"] == "UNAUTHENTICATED"


async def test_me_returns_current_user_after_signup(
    db_client: AsyncClient,
) -> None:
    await db_client.post(SIGNUP, json=_signup("medm", "me@example.com"))
    resp = await db_client.get(ME)
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "medm"
    assert body["email"] == "me@example.com"


async def test_login_by_email_succeeds(db_client: AsyncClient) -> None:
    await db_client.post(SIGNUP, json=_signup("logdm", "log@example.com"))
    db_client.cookies.clear()  # drop the signup session

    resp = await db_client.post(
        LOGIN, json={"identifier": "LOG@example.com", "password": PASSWORD}
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "log@example.com"
    me = await db_client.get(ME)
    assert me.status_code == 200


async def test_login_by_username_succeeds(db_client: AsyncClient) -> None:
    await db_client.post(SIGNUP, json=_signup("namedm", "named@example.com"))
    db_client.cookies.clear()

    # Mixed case identifier resolves to the lowercased stored username.
    resp = await db_client.post(
        LOGIN, json={"identifier": "NameDM", "password": PASSWORD}
    )
    assert resp.status_code == 200
    assert resp.json()["username"] == "namedm"
    me = await db_client.get(ME)
    assert me.status_code == 200


async def test_login_rejects_wrong_password(db_client: AsyncClient) -> None:
    await db_client.post(SIGNUP, json=_signup("wpdm", "wp@example.com"))
    resp = await db_client.post(
        LOGIN,
        json={"identifier": "wp@example.com", "password": "wrongpassword"},
    )
    assert resp.status_code == 401
    assert resp.json()["errorCode"] == "INVALID_CREDENTIALS"


async def test_login_rejects_unknown_identifier(db_client: AsyncClient) -> None:
    resp = await db_client.post(
        LOGIN, json={"identifier": "ghost@example.com", "password": PASSWORD}
    )
    assert resp.status_code == 401
    assert resp.json()["errorCode"] == "INVALID_CREDENTIALS"


async def test_login_rejects_unknown_username(db_client: AsyncClient) -> None:
    resp = await db_client.post(
        LOGIN, json={"identifier": "ghostdm", "password": PASSWORD}
    )
    assert resp.status_code == 401
    assert resp.json()["errorCode"] == "INVALID_CREDENTIALS"


async def test_logout_revokes_session_and_clears_cookies(
    db_client: AsyncClient,
) -> None:
    await db_client.post(SIGNUP, json=_signup("outdm", "out@example.com"))
    resp = await db_client.post(LOGOUT, headers=_csrf_header(db_client))
    assert resp.status_code == 204

    # Cookies cleared; a follow-up authenticated call is rejected.
    me = await db_client.get(ME)
    assert me.status_code == 401


async def test_logout_requires_csrf(db_client: AsyncClient) -> None:
    await db_client.post(SIGNUP, json=_signup("csrfdm", "csrf@example.com"))
    resp = await db_client.post(LOGOUT)  # no X-CSRF-Token header
    assert resp.status_code == 403
    assert resp.json()["errorCode"] == "CSRF_FAILED"


async def test_logout_everywhere_revokes_all_sessions(
    db_client: AsyncClient, db_session: AsyncSession
) -> None:
    await db_client.post(SIGNUP, json=_signup("alldm", "all@example.com"))
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
    await db_client.post(SIGNUP, json=_signup("rehashdm", "rehash@example.com"))
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
        LOGIN, json={"identifier": "rehash@example.com", "password": PASSWORD}
    )
    assert resp.status_code == 200

    await db_session.refresh(user)
    assert user.password_hash != old_hash


def test_author_projection_excludes_email() -> None:
    """The public ``Author`` view carries the handle but never the email."""
    user = User(username="publicdm", email="private@example.com")
    author = Author.from_user(user)
    assert author.username == "publicdm"
    dumped = author.model_dump()
    assert dumped == {"username": "publicdm"}
    assert "email" not in dumped

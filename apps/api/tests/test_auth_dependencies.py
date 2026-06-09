"""Tests for the get_current_user identity seam and CSRF dependency.

Mounts the real dependencies on a throwaway app wired to the transactional
test session, then drives them over HTTP so the full request path
(including the AppError -> JSON handlers) is exercised.
"""

from collections.abc import AsyncGenerator

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CSRF_HEADER_NAME, CurrentUser, RequireCsrf
from app.auth.sessions import create_session
from app.config import settings
from app.db import get_session
from app.exceptions import register_exception_handlers
from app.models import User


def _build_app(db_session: AsyncSession) -> FastAPI:
    app = FastAPI()
    register_exception_handlers(app)

    async def _get_test_session() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_session] = _get_test_session

    @app.get("/whoami")
    async def whoami(user: CurrentUser) -> dict[str, str]:
        return {"email": user.email}

    @app.post("/guarded")
    async def guarded(_: RequireCsrf) -> dict[str, bool]:
        return {"ok": True}

    return app


def _client(db_session: AsyncSession) -> AsyncClient:
    return AsyncClient(
        transport=ASGITransport(app=_build_app(db_session)),
        base_url="http://test",
    )


async def _make_user(db: AsyncSession) -> User:
    user = User(email="seam@example.com", password_hash="argon2-hash")
    db.add(user)
    await db.flush()
    return user


async def test_whoami_401_without_cookie(db_session: AsyncSession) -> None:
    async with _client(db_session) as client:
        resp = await client.get("/whoami")
    assert resp.status_code == 401
    assert resp.json()["errorCode"] == "UNAUTHENTICATED"


async def test_whoami_401_for_invalid_token(db_session: AsyncSession) -> None:
    async with _client(db_session) as client:
        client.cookies.set(settings.session_cookie_name, "not-a-real-token")
        resp = await client.get("/whoami")
    assert resp.status_code == 401


async def test_whoami_returns_user_for_valid_session(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session)
    token = await create_session(db_session, user.id)

    async with _client(db_session) as client:
        client.cookies.set(settings.session_cookie_name, token)
        resp = await client.get("/whoami")
    assert resp.status_code == 200
    assert resp.json()["email"] == "seam@example.com"


async def test_csrf_passes_when_cookie_and_header_match(
    db_session: AsyncSession,
) -> None:
    async with _client(db_session) as client:
        client.cookies.set(settings.csrf_cookie_name, "tok")
        resp = await client.post("/guarded", headers={CSRF_HEADER_NAME: "tok"})
    assert resp.status_code == 200


async def test_csrf_403_when_header_missing(
    db_session: AsyncSession,
) -> None:
    async with _client(db_session) as client:
        client.cookies.set(settings.csrf_cookie_name, "tok")
        resp = await client.post("/guarded")
    assert resp.status_code == 403
    assert resp.json()["errorCode"] == "CSRF_FAILED"


async def test_csrf_403_when_tokens_mismatch(
    db_session: AsyncSession,
) -> None:
    async with _client(db_session) as client:
        client.cookies.set(settings.csrf_cookie_name, "tok")
        resp = await client.post(
            "/guarded", headers={CSRF_HEADER_NAME: "different"}
        )
    assert resp.status_code == 403

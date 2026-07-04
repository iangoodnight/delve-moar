"""Endpoint tests for account self-service: export and deletion (#280).

httpx persists the session and CSRF cookies set at signup, so later
requests on the same client are authenticated automatically. The test DB
is built from ORM metadata, so the SRD system book is seeded explicitly
rather than backfilled by a migration.
"""

import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import (
    Book,
    BookMonster,
    EmailToken,
    Monster,
    Session,
    User,
)

ACCOUNT = "/v1/account"
PASSWORD = "supersecret"


def _csrf_header(client: AsyncClient) -> dict[str, str]:
    """Echo the CSRF cookie back in the double-submit header."""
    return {"X-CSRF-Token": client.cookies[settings.csrf_cookie_name]}


async def _signup(client: AsyncClient, username: str) -> dict[str, Any]:
    """Register and authenticate a user; return the account payload."""
    resp = await client.post(
        "/v1/auth/signup",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": PASSWORD,
        },
    )
    assert resp.status_code == 201
    account: dict[str, Any] = resp.json()
    return account


async def _seed_monster(db_session: AsyncSession, slug: str) -> Monster:
    """Insert a minimal monster row and return it."""
    monster = Monster(
        slug=slug,
        source_namespace="srd-5.1",
        name=slug.replace("-", " ").title(),
        monster_type="beast",
        challenge_rating=None,
        content={},
        content_source={},
    )
    db_session.add(monster)
    await db_session.flush()
    return monster


async def _seed_system_book(db_session: AsyncSession) -> Book:
    """Insert a public, read-only system book (stands in for the SRD book)."""
    book = Book(
        owner_id=None,
        name="SRD 5.1",
        slug="srd-5.1",
        description=None,
        is_public=True,
        is_system=True,
    )
    db_session.add(book)
    await db_session.flush()
    return book


async def _count(db_session: AsyncSession, model: Any, **where: Any) -> int:
    """Count rows of ``model`` matching the given column equality filters."""
    stmt = select(func.count()).select_from(model)
    for column, value in where.items():
        stmt = stmt.where(getattr(model, column) == value)
    return await db_session.scalar(stmt) or 0


async def test_delete_account_cascades_and_signs_out(
    db_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Deleting an account removes the user and every dependent record."""
    account = await _signup(db_client, "deleter")
    user_id = uuid.UUID(account["id"])

    # Give the user a book with a piece of content in it.
    monster = await _seed_monster(db_session, "goblin")
    create = await db_client.post(
        "/v1/books",
        json={"name": "My Collection"},
        headers=_csrf_header(db_client),
    )
    assert create.status_code == 201
    book_id = create.json()["id"]
    add = await db_client.put(
        f"/v1/books/{book_id}/monsters/{monster.id}",
        headers=_csrf_header(db_client),
    )
    assert add.status_code == 204

    # A system book with no owner must survive the deletion.
    system_book = await _seed_system_book(db_session)

    resp = await db_client.request(
        "DELETE",
        ACCOUNT,
        json={"password": PASSWORD},
        headers=_csrf_header(db_client),
    )
    assert resp.status_code == 204

    # User and everything owned by (or referencing) it are gone.
    assert await db_session.get(User, user_id) is None
    assert await _count(db_session, Session, user_id=user_id) == 0
    assert await _count(db_session, EmailToken, user_id=user_id) == 0
    assert await _count(db_session, Book, owner_id=user_id) == 0
    assert await _count(db_session, BookMonster, book_id=book_id) == 0

    # The SRD content row and the system book are untouched.
    assert await db_session.get(Monster, monster.id) is not None
    assert await db_session.get(Book, system_book.id) is not None

    # The browser is signed out: the session cookie no longer authenticates.
    me = await db_client.get("/v1/auth/me")
    assert me.status_code == 401


async def test_delete_account_wrong_password_is_forbidden(
    db_client: AsyncClient, db_session: AsyncSession
) -> None:
    """A wrong re-auth password returns 403 and leaves the account intact."""
    account = await _signup(db_client, "keeper")
    user_id = uuid.UUID(account["id"])

    resp = await db_client.request(
        "DELETE",
        ACCOUNT,
        json={"password": "wrong-password"},
        headers=_csrf_header(db_client),
    )
    assert resp.status_code == 403
    assert resp.json()["errorCode"] == "INVALID_PASSWORD"
    assert await db_session.get(User, user_id) is not None


async def test_delete_account_requires_csrf(db_client: AsyncClient) -> None:
    """Deletion without the CSRF header is rejected before the password."""
    await _signup(db_client, "nocsrf")
    resp = await db_client.request(
        "DELETE", ACCOUNT, json={"password": PASSWORD}
    )
    assert resp.status_code == 403
    assert resp.json()["errorCode"] == "CSRF_FAILED"


async def test_delete_account_requires_authentication(
    db_client: AsyncClient,
) -> None:
    """With CSRF satisfied but no session, deletion is unauthenticated (401)."""
    db_client.cookies.set(settings.csrf_cookie_name, "anon-token")
    resp = await db_client.request(
        "DELETE",
        ACCOUNT,
        json={"password": PASSWORD},
        headers={"X-CSRF-Token": "anon-token"},
    )
    assert resp.status_code == 401


async def test_export_returns_account_and_owned_books(
    db_client: AsyncClient, db_session: AsyncSession
) -> None:
    """The export carries the owner's account view and their books' ids."""
    await _signup(db_client, "exporter")
    monster = await _seed_monster(db_session, "kobold")
    create = await db_client.post(
        "/v1/books",
        json={"name": "Session Prep", "description": "Next week"},
        headers=_csrf_header(db_client),
    )
    book_id = create.json()["id"]
    await db_client.put(
        f"/v1/books/{book_id}/monsters/{monster.id}",
        headers=_csrf_header(db_client),
    )

    resp = await db_client.get(f"{ACCOUNT}/export")
    assert resp.status_code == 200
    body = resp.json()

    assert body["account"]["username"] == "exporter"
    assert body["account"]["email"] == "exporter@example.com"
    assert "exportedAt" in body

    books = {book["id"]: book for book in body["books"]}
    assert book_id in books
    exported = books[book_id]
    assert exported["name"] == "Session Prep"
    assert exported["monsterIds"] == [str(monster.id)]
    assert exported["spellIds"] == []
    assert exported["itemIds"] == []


async def test_export_requires_authentication(db_client: AsyncClient) -> None:
    """An anonymous caller cannot export an account."""
    resp = await db_client.get(f"{ACCOUNT}/export")
    assert resp.status_code == 401

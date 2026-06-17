"""Endpoint tests for the books API (ADR 0014).

httpx persists cookies on the client, so the session and CSRF cookies set
at signup carry into later requests automatically. The test DB is built
from the ORM metadata, not the migration, so system books are seeded
explicitly via ``db_session`` rather than backfilled.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Book

BOOKS = "/v1/books"


def _csrf_header(client: AsyncClient) -> dict[str, str]:
    """Echo the CSRF cookie back in the double-submit header."""
    return {"X-CSRF-Token": client.cookies[settings.csrf_cookie_name]}


async def _signup(client: AsyncClient, username: str) -> None:
    """Register and authenticate a user on the client."""
    resp = await client.post(
        "/v1/auth/signup",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "supersecret",
        },
    )
    assert resp.status_code == 201


async def _seed_system_book(db_session: AsyncSession) -> Book:
    """Insert a public, read-only system book (stands in for the SRD book)."""
    book = Book(
        owner_id=None,
        name="SRD 5.1",
        slug="srd-5.1",
        description="System book.",
        is_public=True,
        is_system=True,
    )
    db_session.add(book)
    await db_session.flush()
    await db_session.refresh(book)
    return book


async def test_list_requires_auth(db_client: AsyncClient) -> None:
    resp = await db_client.get(BOOKS)
    assert resp.status_code == 401


async def test_create_book(db_client: AsyncClient) -> None:
    await _signup(db_client, "creator")
    resp = await db_client.post(
        BOOKS,
        json={"name": "Fantasy Monsters", "description": "Big lizards."},
        headers=_csrf_header(db_client),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Fantasy Monsters"
    assert body["description"] == "Big lizards."
    assert body["isSystem"] is False
    assert body["isPublic"] is False
    assert body["owner"] == {"username": "creator"}
    assert body["monsterCount"] == 0
    assert body["spellCount"] == 0
    assert body["itemCount"] == 0


async def test_create_requires_csrf(db_client: AsyncClient) -> None:
    await _signup(db_client, "nocsrf")
    resp = await db_client.post(BOOKS, json={"name": "No CSRF"})
    assert resp.status_code == 403


async def test_create_rejects_blank_name(db_client: AsyncClient) -> None:
    await _signup(db_client, "blankname")
    resp = await db_client.post(
        BOOKS, json={"name": ""}, headers=_csrf_header(db_client)
    )
    assert resp.status_code == 422


async def test_list_includes_own_and_public_books(
    db_session: AsyncSession, db_client: AsyncClient
) -> None:
    await _seed_system_book(db_session)
    await _signup(db_client, "lister")
    await db_client.post(
        BOOKS, json={"name": "Mine"}, headers=_csrf_header(db_client)
    )

    resp = await db_client.get(BOOKS)
    assert resp.status_code == 200
    names = {b["name"] for b in resp.json()["data"]}
    assert {"Mine", "SRD 5.1"} <= names


async def test_get_book(db_client: AsyncClient) -> None:
    await _signup(db_client, "getter")
    created = await db_client.post(
        BOOKS, json={"name": "Readme"}, headers=_csrf_header(db_client)
    )
    book_id = created.json()["id"]

    resp = await db_client.get(f"{BOOKS}/{book_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Readme"


async def test_get_missing_book_404(db_client: AsyncClient) -> None:
    await _signup(db_client, "missing")
    resp = await db_client.get(f"{BOOKS}/{uuid.uuid4()}")
    assert resp.status_code == 404


async def test_update_book(db_client: AsyncClient) -> None:
    await _signup(db_client, "editor")
    created = await db_client.post(
        BOOKS,
        json={"name": "Old", "description": "old"},
        headers=_csrf_header(db_client),
    )
    book_id = created.json()["id"]

    resp = await db_client.patch(
        f"{BOOKS}/{book_id}",
        json={"name": "New"},
        headers=_csrf_header(db_client),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "New"
    # Unprovided fields are left unchanged.
    assert body["description"] == "old"


async def test_delete_book(db_client: AsyncClient) -> None:
    await _signup(db_client, "deleter")
    created = await db_client.post(
        BOOKS, json={"name": "Doomed"}, headers=_csrf_header(db_client)
    )
    book_id = created.json()["id"]

    resp = await db_client.delete(
        f"{BOOKS}/{book_id}", headers=_csrf_header(db_client)
    )
    assert resp.status_code == 204
    assert (await db_client.get(f"{BOOKS}/{book_id}")).status_code == 404


async def test_other_users_private_book_is_hidden(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "owneruser")
    created = await db_client.post(
        BOOKS, json={"name": "Secret"}, headers=_csrf_header(db_client)
    )
    book_id = created.json()["id"]

    # Re-signup switches the persisted cookies to a different user.
    await _signup(db_client, "intruder")
    assert (await db_client.get(f"{BOOKS}/{book_id}")).status_code == 404
    patched = await db_client.patch(
        f"{BOOKS}/{book_id}",
        json={"name": "Hijacked"},
        headers=_csrf_header(db_client),
    )
    assert patched.status_code == 404


async def test_system_book_is_readable_but_not_writable(
    db_session: AsyncSession, db_client: AsyncClient
) -> None:
    book = await _seed_system_book(db_session)
    await _signup(db_client, "reader")

    assert (await db_client.get(f"{BOOKS}/{book.id}")).status_code == 200
    patched = await db_client.patch(
        f"{BOOKS}/{book.id}",
        json={"name": "Mine now"},
        headers=_csrf_header(db_client),
    )
    assert patched.status_code == 403
    deleted = await db_client.delete(
        f"{BOOKS}/{book.id}", headers=_csrf_header(db_client)
    )
    assert deleted.status_code == 403


@pytest.mark.parametrize("method", ["patch", "delete"])
async def test_write_missing_book_404(
    db_client: AsyncClient, method: str
) -> None:
    await _signup(db_client, f"writer{method}")
    request = getattr(db_client, method)
    kwargs: dict = {"headers": _csrf_header(db_client)}
    if method == "patch":
        kwargs["json"] = {"name": "x"}
    resp = await request(f"{BOOKS}/{uuid.uuid4()}", **kwargs)
    assert resp.status_code == 404


async def _create(db_client: AsyncClient, name: str) -> None:
    """Create a book by name on the authenticated client."""
    resp = await db_client.post(
        BOOKS, json={"name": name}, headers=_csrf_header(db_client)
    )
    assert resp.status_code == 201


async def test_search_matches_name(db_client: AsyncClient) -> None:
    await _signup(db_client, "searcher")
    await _create(db_client, "Fire Giants")
    await _create(db_client, "Frost Spells")

    resp = await db_client.get(BOOKS, params={"search": "giant"})
    assert resp.status_code == 200
    names = [b["name"] for b in resp.json()["data"]]
    assert names == ["Fire Giants"]


async def test_order_by_name_desc(db_client: AsyncClient) -> None:
    await _signup(db_client, "sorter")
    await _create(db_client, "Aaa")
    await _create(db_client, "Zzz")

    resp = await db_client.get(BOOKS, params={"order_by": "name:desc"})
    assert resp.status_code == 200
    names = [b["name"] for b in resp.json()["data"]]
    assert names == ["Zzz", "Aaa"]


async def test_invalid_order_by_422(db_client: AsyncClient) -> None:
    await _signup(db_client, "badsort")
    resp = await db_client.get(BOOKS, params={"order_by": "bogus:asc"})
    assert resp.status_code == 422

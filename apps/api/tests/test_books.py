"""Endpoint tests for the books API (ADR 0014).

httpx persists cookies on the client, so the session and CSRF cookies set
at signup carry into later requests automatically. The test DB is built
from the ORM metadata, not the migration, so system books are seeded
explicitly via ``db_session`` rather than backfilled.
"""

import uuid
from collections.abc import Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Book, Item, Monster, Spell

BOOKS = "/v1/books"

# resource path -> (ORM model, row factory keyed by index, detail count key)
_CONTENT: dict[
    str,
    tuple[
        type[Item] | type[Monster] | type[Spell],
        Callable[[int], dict[str, Any]],
        str,
    ],
] = {
    "monsters": (
        Monster,
        lambda i: {
            "slug": f"monster-{i}",
            "source_namespace": "srd-5.1",
            "name": f"Monster {i}",
            "monster_type": "beast",
            "challenge_rating": None,
            "content": {},
            "content_source": {},
        },
        "monsterCount",
    ),
    "spells": (
        Spell,
        lambda i: {
            "slug": f"spell-{i}",
            "source_namespace": "srd-5.1",
            "name": f"Spell {i}",
            "level": 1,
            "school": "evocation",
            "content": {},
            "content_source": {},
        },
        "spellCount",
    ),
    "items": (
        Item,
        lambda i: {
            "slug": f"item-{i}",
            "source_namespace": "srd-5.1",
            "name": f"Item {i}",
            "item_category": "weapon",
            "rarity": None,
            "content": {},
            "content_source": {},
        },
        "itemCount",
    ),
}


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


async def test_list_scope_owned_excludes_public_books(
    db_session: AsyncSession, db_client: AsyncClient
) -> None:
    await _seed_system_book(db_session)
    await _signup(db_client, "owneronly")
    await db_client.post(
        BOOKS, json={"name": "Mine"}, headers=_csrf_header(db_client)
    )

    resp = await db_client.get(BOOKS, params={"scope": "owned"})
    assert resp.status_code == 200
    names = {b["name"] for b in resp.json()["data"]}
    assert names == {"Mine"}


async def test_list_invalid_scope_422(db_client: AsyncClient) -> None:
    await _signup(db_client, "badscope")
    resp = await db_client.get(BOOKS, params={"scope": "everything"})
    assert resp.status_code == 422


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
    kwargs: dict[str, Any] = {"headers": _csrf_header(db_client)}
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


async def _seed_content(
    db_session: AsyncSession, resource: str, index: int
) -> uuid.UUID:
    """Insert one SRD content row of the given resource type."""
    model, factory, _ = _CONTENT[resource]
    row = model(**factory(index))
    db_session.add(row)
    await db_session.flush()
    await db_session.refresh(row)
    return row.id


async def _new_book(db_client: AsyncClient, name: str = "Curated") -> str:
    """Create a book and return its id."""
    resp = await db_client.post(
        BOOKS, json={"name": name}, headers=_csrf_header(db_client)
    )
    assert resp.status_code == 201
    book_id: str = resp.json()["id"]
    return book_id


@pytest.mark.parametrize("resource", ["monsters", "spells", "items"])
async def test_add_list_remove_content(
    db_session: AsyncSession, db_client: AsyncClient, resource: str
) -> None:
    content_id = await _seed_content(db_session, resource, 1)
    await _signup(db_client, f"curator{resource[:1]}")
    book_id = await _new_book(db_client)
    member = f"{BOOKS}/{book_id}/{resource}/{content_id}"
    count_key = _CONTENT[resource][2]

    added = await db_client.put(member, headers=_csrf_header(db_client))
    assert added.status_code == 204
    # Adding again is idempotent.
    again = await db_client.put(member, headers=_csrf_header(db_client))
    assert again.status_code == 204

    listed = await db_client.get(f"{BOOKS}/{book_id}/{resource}")
    assert listed.status_code == 200
    assert len(listed.json()["data"]) == 1

    detail = await db_client.get(f"{BOOKS}/{book_id}")
    assert detail.json()[count_key] == 1

    removed = await db_client.delete(member, headers=_csrf_header(db_client))
    assert removed.status_code == 204
    # Removing again is idempotent.
    again = await db_client.delete(member, headers=_csrf_header(db_client))
    assert again.status_code == 204
    detail = await db_client.get(f"{BOOKS}/{book_id}")
    assert detail.json()[count_key] == 0


async def test_add_missing_content_404(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "addmissing")
    book_id = await _new_book(db_client)
    resp = await db_client.put(
        f"{BOOKS}/{book_id}/monsters/{uuid.uuid4()}",
        headers=_csrf_header(db_client),
    )
    assert resp.status_code == 404


async def test_add_content_requires_csrf(
    db_session: AsyncSession, db_client: AsyncClient
) -> None:
    content_id = await _seed_content(db_session, "monsters", 1)
    await _signup(db_client, "addnocsrf")
    book_id = await _new_book(db_client)
    resp = await db_client.put(f"{BOOKS}/{book_id}/monsters/{content_id}")
    assert resp.status_code == 403


async def test_add_to_system_book_forbidden(
    db_session: AsyncSession, db_client: AsyncClient
) -> None:
    book = await _seed_system_book(db_session)
    content_id = await _seed_content(db_session, "monsters", 1)
    await _signup(db_client, "sysadder")
    resp = await db_client.put(
        f"{BOOKS}/{book.id}/monsters/{content_id}",
        headers=_csrf_header(db_client),
    )
    assert resp.status_code == 403


async def test_list_contents_of_hidden_book_404(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "contentowner")
    book_id = await _new_book(db_client)
    await _signup(db_client, "contentintruder")
    resp = await db_client.get(f"{BOOKS}/{book_id}/monsters")
    assert resp.status_code == 404


async def test_book_contents_search_and_order(
    db_session: AsyncSession, db_client: AsyncClient
) -> None:
    fire = await _seed_content(db_session, "monsters", 1)
    frost = Monster(
        slug="monster-2",
        source_namespace="srd-5.1",
        name="Frost Worm",
        monster_type="beast",
        content={},
        content_source={},
    )
    db_session.add(frost)
    await db_session.flush()
    await _signup(db_client, "contentsearch")
    book_id = await _new_book(db_client)
    headers = _csrf_header(db_client)
    await db_client.put(f"{BOOKS}/{book_id}/monsters/{fire}", headers=headers)
    await db_client.put(
        f"{BOOKS}/{book_id}/monsters/{frost.id}", headers=headers
    )

    found = await db_client.get(
        f"{BOOKS}/{book_id}/monsters", params={"search": "frost"}
    )
    assert [m["name"] for m in found.json()["data"]] == ["Frost Worm"]

    ordered = await db_client.get(
        f"{BOOKS}/{book_id}/monsters", params={"order_by": "name:desc"}
    )
    assert [m["name"] for m in ordered.json()["data"]] == [
        "Monster 1",
        "Frost Worm",
    ]

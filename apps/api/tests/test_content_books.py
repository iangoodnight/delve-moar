"""Book-aware behavior on the public content endpoints (#248).

Covers the `book` membership filter, the `include=book_memberships`
annotation, and the optional-auth seam that lets anonymous SRD browse
coexist with per-user personalization. Parametrized across the three
content resources, which share the implementation.

httpx persists cookies, so the session/CSRF cookies set at signup carry
into later requests. The test DB is built from ORM metadata, so content
and system books are seeded directly via ``db_session``.
"""

import uuid
from collections.abc import Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import (
    Book,
    BookItem,
    BookMonster,
    BookSpell,
    Item,
    Monster,
    Spell,
)
from tests.conftest import (
    MINIMAL_MONSTER_CONTENT_FIXTURE,
    MINIMAL_SPELL_CONTENT_FIXTURE,
    SRD_CONTENT_SOURCE_FIXTURE,
)

BOOKS = "/v1/books"

RESOURCES = ["monsters", "spells", "items"]

# resource -> (model, row factory keyed by index, join model, join fk name)
_CONTENT: dict[
    str,
    tuple[
        type[Monster] | type[Spell] | type[Item],
        Callable[[int], dict[str, Any]],
        type[BookMonster] | type[BookSpell] | type[BookItem],
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
            "content": {**MINIMAL_MONSTER_CONTENT_FIXTURE, "index": f"m-{i}"},
            "content_source": SRD_CONTENT_SOURCE_FIXTURE,
        },
        BookMonster,
        "monster_id",
    ),
    "spells": (
        Spell,
        lambda i: {
            "slug": f"spell-{i}",
            "source_namespace": "srd-5.1",
            "name": f"Spell {i}",
            "level": 1,
            "school": "evocation",
            "content": {**MINIMAL_SPELL_CONTENT_FIXTURE, "index": f"s-{i}"},
            "content_source": SRD_CONTENT_SOURCE_FIXTURE,
        },
        BookSpell,
        "spell_id",
    ),
    "items": (
        Item,
        lambda i: {
            "slug": f"item-{i}",
            "source_namespace": "srd-5.1",
            "name": f"Item {i}",
            "item_category": "weapon",
            "rarity": None,
            "content": {"name": f"Item {i}", "index": f"i-{i}"},
            "content_source": SRD_CONTENT_SOURCE_FIXTURE,
        },
        BookItem,
        "item_id",
    ),
}


def _csrf_header(client: AsyncClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies[settings.csrf_cookie_name]}


async def _signup(client: AsyncClient, username: str) -> None:
    resp = await client.post(
        "/v1/auth/signup",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "supersecret",
        },
    )
    assert resp.status_code == 201


async def _seed_content(
    db_session: AsyncSession, resource: str, index: int
) -> uuid.UUID:
    model, factory, _, _ = _CONTENT[resource]
    row = model(**factory(index))
    db_session.add(row)
    await db_session.flush()
    await db_session.refresh(row)
    return row.id


def _slug(resource: str, index: int) -> str:
    return str(_CONTENT[resource][1](index)["slug"])


async def _new_book(db_client: AsyncClient, name: str) -> str:
    resp = await db_client.post(
        BOOKS, json={"name": name}, headers=_csrf_header(db_client)
    )
    assert resp.status_code == 201
    book_id: str = resp.json()["id"]
    return book_id


async def _add(
    db_client: AsyncClient, book_id: str, resource: str, content_id: uuid.UUID
) -> None:
    resp = await db_client.put(
        f"{BOOKS}/{book_id}/{resource}/{content_id}",
        headers=_csrf_header(db_client),
    )
    assert resp.status_code == 204


async def _seed_system_book(db_session: AsyncSession) -> Book:
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


@pytest.mark.parametrize("resource", RESOURCES)
async def test_book_filter_unions_selected_books(
    db_session: AsyncSession, db_client: AsyncClient, resource: str
) -> None:
    first = await _seed_content(db_session, resource, 1)
    second = await _seed_content(db_session, resource, 2)
    await _seed_content(db_session, resource, 3)
    await _signup(db_client, f"unioner{resource[:1]}")
    book_a = await _new_book(db_client, "A")
    book_b = await _new_book(db_client, "B")
    await _add(db_client, book_a, resource, first)
    await _add(db_client, book_b, resource, second)

    both = await db_client.get(
        f"/v1/{resource}", params={"book": [book_a, book_b]}
    )
    assert both.status_code == 200
    assert {r["name"] for r in both.json()["data"]} == {
        f"{resource[:-1].capitalize()} 1",
        f"{resource[:-1].capitalize()} 2",
    }

    only_a = await db_client.get(f"/v1/{resource}", params={"book": book_a})
    assert {r["slug"] for r in only_a.json()["data"]} == {_slug(resource, 1)}


@pytest.mark.parametrize("resource", RESOURCES)
async def test_book_filter_unknown_book_404(
    db_client: AsyncClient, resource: str
) -> None:
    await _signup(db_client, f"unknown{resource[:1]}")
    resp = await db_client.get(
        f"/v1/{resource}", params={"book": str(uuid.uuid4())}
    )
    assert resp.status_code == 404


async def test_book_filter_other_users_private_book_404(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "filterowner")
    book_id = await _new_book(db_client, "Secret")
    # Re-signup switches the persisted cookies to a different user.
    await _signup(db_client, "filterintruder")
    resp = await db_client.get("/v1/monsters", params={"book": book_id})
    assert resp.status_code == 404


async def test_anonymous_can_filter_by_public_book(
    db_session: AsyncSession, db_client: AsyncClient
) -> None:
    book = await _seed_system_book(db_session)
    content_id = await _seed_content(db_session, "monsters", 1)
    await _seed_content(db_session, "monsters", 2)
    # System books are write-protected via the API, so link directly.
    db_session.add(BookMonster(book_id=book.id, monster_id=content_id))
    await db_session.flush()

    # No signup: the request is anonymous (optional-auth resolves to None).
    resp = await db_client.get("/v1/monsters", params={"book": str(book.id)})
    assert resp.status_code == 200
    assert {r["slug"] for r in resp.json()["data"]} == {"monster-1"}


async def test_anonymous_filter_by_private_book_404(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "privowner")
    book_id = await _new_book(db_client, "Private")
    db_client.cookies.clear()  # drop the session; request as anonymous
    resp = await db_client.get("/v1/monsters", params={"book": book_id})
    assert resp.status_code == 404


@pytest.mark.parametrize("resource", RESOURCES)
async def test_include_annotates_owned_books_only(
    db_session: AsyncSession, db_client: AsyncClient, resource: str
) -> None:
    in_book = await _seed_content(db_session, resource, 1)
    await _seed_content(db_session, resource, 2)
    await _signup(db_client, f"annot{resource[:1]}")
    book_id = await _new_book(db_client, "Mine")
    await _add(db_client, book_id, resource, in_book)

    resp = await db_client.get(
        f"/v1/{resource}", params={"include": "book_memberships"}
    )
    assert resp.status_code == 200
    by_slug = {r["slug"]: r["bookMemberships"] for r in resp.json()["data"]}
    assert by_slug[_slug(resource, 1)] == [
        {"id": book_id, "name": "Mine", "slug": None}
    ]
    # Content the user has not collected is annotated with an empty list.
    assert by_slug[_slug(resource, 2)] == []


async def test_include_excludes_public_system_book(
    db_session: AsyncSession, db_client: AsyncClient
) -> None:
    book = await _seed_system_book(db_session)
    content_id = await _seed_content(db_session, "monsters", 1)
    db_session.add(BookMonster(book_id=book.id, monster_id=content_id))
    await db_session.flush()
    await _signup(db_client, "sysannot")

    resp = await db_client.get(
        "/v1/monsters", params={"include": "book_memberships"}
    )
    # The SRD system book is not "yours", so it never appears as a badge.
    assert resp.json()["data"][0]["bookMemberships"] == []


async def test_membership_omitted_without_include(
    db_session: AsyncSession, db_client: AsyncClient
) -> None:
    await _seed_content(db_session, "monsters", 1)
    await _signup(db_client, "noinclude")
    resp = await db_client.get("/v1/monsters")
    assert resp.json()["data"][0]["bookMemberships"] is None


async def test_membership_omitted_for_anonymous(
    db_session: AsyncSession, db_client: AsyncClient
) -> None:
    await _seed_content(db_session, "monsters", 1)
    resp = await db_client.get(
        "/v1/monsters", params={"include": "book_memberships"}
    )
    assert resp.json()["data"][0]["bookMemberships"] is None


async def test_include_on_empty_book_returns_no_rows(
    db_client: AsyncClient,
) -> None:
    await _signup(db_client, "emptybook")
    book_id = await _new_book(db_client, "Empty")
    resp = await db_client.get(
        "/v1/monsters",
        params={"book": book_id, "include": "book_memberships"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"] == []


@pytest.mark.parametrize("resource", RESOURCES)
async def test_detail_include_book_memberships(
    db_session: AsyncSession, db_client: AsyncClient, resource: str
) -> None:
    content_id = await _seed_content(db_session, resource, 1)
    await _signup(db_client, f"detail{resource[:1]}")
    book_id = await _new_book(db_client, "Mine")
    await _add(db_client, book_id, resource, content_id)
    slug = _slug(resource, 1)

    annotated = await db_client.get(
        f"/v1/{resource}/{slug}", params={"include": "book_memberships"}
    )
    assert annotated.json()["bookMemberships"] == [
        {"id": book_id, "name": "Mine", "slug": None}
    ]

    plain = await db_client.get(f"/v1/{resource}/{slug}")
    assert plain.json()["bookMemberships"] is None

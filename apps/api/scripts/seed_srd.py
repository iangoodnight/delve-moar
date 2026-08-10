"""SRD seed script — populates monsters, spells, and items from dnd5eapi.co.

Usage (from apps/api/):
    uv run python scripts/seed_srd.py monsters
    uv run python scripts/seed_srd.py spells
    uv run python scripts/seed_srd.py items
    uv run python scripts/seed_srd.py all

All operations are fully idempotent — safe to re-run after API changes.

Attribution
-----------
Content: Wizards of the Coast LLC — SRD 5.1 (CC BY 4.0)
Data:    5e-bits/5e-database — https://github.com/5e-bits/5e-database
See scripts/SEED_ATTRIBUTION.md for full details.
"""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
import time
from decimal import Decimal
from typing import Any

import httpx
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.models import Item, Monster, Spell
from app.utils import cr_display

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_URL = "https://www.dnd5eapi.co/api/2014"
RATE_LIMIT_DELAY = 0.1  # seconds between detail requests — be polite
SRD_NAMESPACE = "srd-5.1"
# Stable slug of the system SRD book (ADR 0014). Migration 007 creates the
# book; this script links freshly-seeded content into it.
SRD_BOOK_SLUG = "srd-5.1"

SRD_CONTENT_SOURCE: dict[str, str] = {
    "type": "srd",
    "license": "CC BY 4.0",
    "license_url": "https://creativecommons.org/licenses/by/4.0/",
    "attribution": "Wizards of the Coast LLC — Systems Reference Document 5.1",
    "data_provider": "5e-bits/5e-database",
    "data_provider_url": "https://github.com/5e-bits/5e-database",
}

# ---------------------------------------------------------------------------
# DB session factory
# ---------------------------------------------------------------------------


def make_session_factory(database_url: str) -> async_sessionmaker[AsyncSession]:
    """Create a SQLAlchemy async session factory for the given database URL.

    Args:
        database_url: The database connection URL.

    Returns:
        An async_sessionmaker that can be used to create AsyncSession instances.

    Note:
        The session factory is configured with expire_on_commit=False to prevent
        automatic expiration of objects after commit, which is often desirable
        in scripts that perform batch operations.

    Usage:
        session_factory = make_session_factory(settings.database_url)
        async with session_factory() as session:
            # Use session to interact with the database
            ...
    """
    engine = create_async_engine(database_url, echo=False)
    return async_sessionmaker(engine, expire_on_commit=False)


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


async def fetch_index(
    client: httpx.AsyncClient, path: str
) -> list[dict[str, Any]]:
    """Fetch a full index listing, handling the {count, results} envelope.

    Args:
        client: An instance of httpx.AsyncClient to use for the request.
        path: The relative API path to fetch (e.g., "/monsters", "/spells").

    Returns:
        A list of result entries extracted from the API response.

    Note:
        The API response is expected to be a JSON object containing a "results"
        field, which is a list of entries. This function extracts and returns
        that list directly.

    Usage:
        async with httpx.AsyncClient() as client:
            monsters = await fetch_index(client, "/monsters")
            spells = await fetch_index(client, "/spells")
    """
    resp = await client.get(f"{BASE_URL}{path}")
    resp.raise_for_status()
    data: dict[str, Any] = resp.json()
    return list(data["results"])


async def fetch_detail(client: httpx.AsyncClient, url: str) -> dict[str, Any]:
    """Fetch a single resource detail by its relative URL.

    Args:
        client: An instance of httpx.AsyncClient to use for the request.
        url: The relative URL of the resource to fetch (e.g., "/monsters/1").

    Returns:
        A dictionary containing the detailed data of the resource.

    Note:
        The URL should be a relative path as provided in the index results. This
        function constructs the full URL by prefixing it with the base API URL
        and then performs the GET request to retrieve the resource details.

    Usage:
        async with httpx.AsyncClient() as client:
            detail = await fetch_detail(client, "/monsters/1")
    """
    resp = await client.get(f"https://www.dnd5eapi.co{url}")
    resp.raise_for_status()
    result: dict[str, Any] = resp.json()
    return result


# ---------------------------------------------------------------------------
# Seed: monsters
# ---------------------------------------------------------------------------


async def seed_monsters(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Seed monsters from the SRD API.

    This function performs the following steps:
        1. Fetches the monster index from the API to get a list of all monsters.
        2. Iterates through each monster entry in the index, fetching detailed
           entries for each monster and preparing rows for database insertion.
        3. Upserts the monster data into the database, ensuring that existing
           entries are updated rather than duplicated.

    Args:
        session_factory: An async_sessionmaker for creating database sessions.

    Returns:
        None

    Usage:
        session_factory = make_session_factory(settings.database_url)
        asyncio.run(seed_monsters(session_factory))
    """
    print("→ Fetching monster index…")
    async with httpx.AsyncClient(timeout=30) as client:
        index = await fetch_index(client, "/monsters")
        total = len(index)
        print(f"  Found {total} monsters.")

        rows: list[dict[str, Any]] = []
        for i, entry in enumerate(index, 1):
            detail = await fetch_detail(client, entry["url"])
            cr_raw: float = detail.get("challenge_rating", 0)
            rows.append(
                {
                    "slug": detail["index"],
                    "source_namespace": SRD_NAMESPACE,
                    "name": detail["name"],
                    "monster_type": detail.get("type"),
                    "challenge_rating": Decimal(str(cr_raw)).quantize(
                        Decimal("0.001")
                    ),
                    "content": detail,
                    "content_source": SRD_CONTENT_SOURCE,
                }
            )
            cr_str = cr_display(cr_raw)
            print(
                f"\r  Fetching {i}/{total} — {detail['name']} (CR {cr_str})"
                "\033[K",
                end="",
                flush=True,
            )
            if i < total:
                time.sleep(RATE_LIMIT_DELAY)

    print()  # newline after progress line

    print("→ Upserting monsters…")
    async with session_factory() as session:
        stmt = pg_insert(Monster).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["slug", "source_namespace"],
            set_={
                "name": stmt.excluded.name,
                "monster_type": stmt.excluded.monster_type,
                "challenge_rating": stmt.excluded.challenge_rating,
                "content": stmt.excluded.content,
                "content_source": stmt.excluded.content_source,
                "updated_at": sa.text("NOW()"),
            },
        )
        await session.execute(stmt)
        await session.commit()

    print(f"✓ {total} monsters upserted.")
    _print_attribution()


# ---------------------------------------------------------------------------
# Seed: spells
# ---------------------------------------------------------------------------


async def seed_spells(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Seed spells from the SRD API.

    This function performs the following steps:
        1. Fetches the spell index from the API to get a list of all spells.
        2. Iterates through each spell entry in the index, fetching detailed
           entries for each spell and preparing rows for database insertion.
        3. Upserts the spell data into the database, ensuring that existing
           entries are updated rather than duplicated.

    Args:
        session_factory: An async_sessionmaker for creating database sessions.

    Returns:
        None

    Usage:
        session_factory = make_session_factory(settings.database_url)
        asyncio.run(seed_spells(session_factory))
    """
    print("→ Fetching spell index…")
    async with httpx.AsyncClient(timeout=30) as client:
        index = await fetch_index(client, "/spells")
        total = len(index)
        print(f"  Found {total} spells.")

        rows: list[dict[str, Any]] = []
        for i, entry in enumerate(index, 1):
            detail = await fetch_detail(client, entry["url"])
            rows.append(
                {
                    "slug": detail["index"],
                    "source_namespace": SRD_NAMESPACE,
                    "name": detail["name"],
                    "level": detail["level"],
                    "school": detail["school"]["index"],
                    "content": detail,
                    "content_source": SRD_CONTENT_SOURCE,
                }
            )
            print(
                f"\r  Fetching {i}/{total} — {detail['name']}\033[K",
                end="",
                flush=True,
            )
            if i < total:
                time.sleep(RATE_LIMIT_DELAY)

    print()  # newline after progress line

    print("→ Upserting spells…")
    async with session_factory() as session:
        stmt = pg_insert(Spell).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["slug", "source_namespace"],
            set_={
                "name": stmt.excluded.name,
                "level": stmt.excluded.level,
                "school": stmt.excluded.school,
                "content": stmt.excluded.content,
                "content_source": stmt.excluded.content_source,
                "updated_at": sa.text("NOW()"),
            },
        )
        await session.execute(stmt)
        await session.commit()

    print(f"✓ {total} spells upserted.")
    _print_attribution()


# ---------------------------------------------------------------------------
# Magic-item metadata preamble parsing
# ---------------------------------------------------------------------------

# SRD magic items store a metadata line as the first `desc` entry, e.g.
# "Wondrous item, rare (requires attunement by a wizard)". It restates the
# item's category and rarity (both kept as structured columns) and is the
# only place the attunement requirement is recorded.
#
# Detect that preamble structurally: a short leading phrase, a comma, then a
# rarity classification. Anchoring the rarity right after a comma keeps prose
# mentions of "rare"/"legendary" mid-description from matching, and matching
# only up to the rarity tolerates the source category typo "Wondous item".
_MAGIC_ITEM_PREAMBLE_RE = re.compile(
    r"^.{0,140}?,\s*"
    r"(?:very\s+rare|rare|uncommon|common|legendary|artifact|varies|rarity\b)",
    re.IGNORECASE,
)

# The attunement clause within the preamble. Group 1 keeps any by-restriction
# ("requires attunement by a spellcaster").
_ATTUNEMENT_RE = re.compile(r"\((requires attunement[^)]*)\)", re.IGNORECASE)


def parse_magic_item_preamble(
    desc: list[str],
) -> tuple[str | None, list[str]]:
    """Split the SRD magic-item metadata preamble off the description.

    The first ``desc`` entry of an SRD magic item is a metadata line such as
    ``"Wondrous item, rare (requires attunement by a wizard)"``. It duplicates
    the item's category and rarity (both stored as structured columns) and
    carries the only record of the attunement requirement.

    When the first line is that preamble, return the parsed attunement clause
    (with any by-restriction preserved, or ``None`` when the item needs no
    attunement) and the description with the preamble line removed. When it is
    not, return the description unchanged with no attunement, so homebrew
    payloads and future data shapes pass through untouched.

    Args:
        desc: The item's ``desc`` list from the SRD payload.

    Returns:
        An ``(attunement, description)`` tuple.
    """
    if not desc:
        return None, desc
    first = desc[0].strip()
    if not _MAGIC_ITEM_PREAMBLE_RE.match(first):
        return None, desc
    match = _ATTUNEMENT_RE.search(first)
    attunement = match.group(1).strip() if match is not None else None
    return attunement, desc[1:]


# ---------------------------------------------------------------------------
# Seed: items
# ---------------------------------------------------------------------------


async def seed_items(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Seed items from the SRD API.

    This function calls both `seed_equipment` and `seed_magic_items` to perform
    the seeding of equipment and magic items, respectively. For our purposes
    these are both considered "items" and will be stored in the same database
    table.

    Args:
        session_factory: An async_sessionmaker for creating database sessions.

    Returns:
        None

    Usage:
        session_factory = make_session_factory(settings.database_url)
        asyncio.run(seed_items(session_factory))
    """
    print("→ Seeding equipment items…")
    await seed_equipment(session_factory)
    print("→ Seeding magic items…")
    await seed_magic_items(session_factory)
    print("✓ All items upserted.")


async def seed_equipment(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Seed equipment from the SRD API.

    This function performs the following steps:
        1. Fetches the equipment index from the API to get a list of all
           equipment items.
        2. Iterates through each equipment entry in the index, fetching detailed
           entries for each item and preparing rows for database insertion.
        3. Upserts the equipment data into the database, ensuring that existing
           entries are updated rather than duplicated.

    Args:
        session_factory: An async_sessionmaker for creating database sessions.

    Returns:
        None

    Usage:
        session_factory = make_session_factory(settings.database_url)
        asyncio.run(seed_equipment(session_factory))
    """
    print("→ Fetching equipment index…")
    async with httpx.AsyncClient(timeout=30) as client:
        index = await fetch_index(client, "/equipment")
        total = len(index)
        print(f"  Found {total} equipment items.")

        rows: list[dict[str, Any]] = []
        for i, entry in enumerate(index, 1):
            detail = await fetch_detail(client, entry["url"])
            rows.append(
                {
                    "slug": detail["index"],
                    "source_namespace": SRD_NAMESPACE,
                    "name": detail["name"],
                    "item_category": detail["equipment_category"]["index"],
                    "rarity": None,  # only applies to magic items
                    "content": detail,
                    "content_source": SRD_CONTENT_SOURCE,
                }
            )
            print(
                f"\r  Fetching {i}/{total} — {detail['name']}\033[K",
                end="",
                flush=True,
            )
            if i < total:
                time.sleep(RATE_LIMIT_DELAY)

        print()  # newline after progress line

        print("→ Upserting equipment…")
        async with session_factory() as session:
            stmt = pg_insert(Item).values(rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=["slug", "source_namespace"],
                set_={
                    "name": stmt.excluded.name,
                    "item_category": stmt.excluded.item_category,
                    "rarity": stmt.excluded.rarity,
                    "content": stmt.excluded.content,
                    "content_source": stmt.excluded.content_source,
                    "updated_at": sa.text("NOW()"),
                },
            )
            await session.execute(stmt)
            await session.commit()

        print(f"✓ {total} equipment items upserted.")
        _print_attribution()


async def seed_magic_items(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Seed magic items from the SRD API.

    This function performs the following steps:
        1. Fetches the magic item index from the API to get a list of all
           magic items.
        2. Iterates through each magic item entry in the index, fetching
           detailed entries for each item and preparing rows for database
           insertion.
        3. Upserts the magic item data into the database, ensuring that existing
           entries are updated rather than duplicated.

    Args:
        session_factory: An async_sessionmaker for creating database sessions.

    Returns:
        None

    Usage:
        session_factory = make_session_factory(settings.database_url)
        asyncio.run(seed_magic_items(session_factory))
    """
    print("→ Fetching magic item index…")
    async with httpx.AsyncClient(timeout=30) as client:
        index = await fetch_index(client, "/magic-items")
        total = len(index)
        print(f"  Found {total} magic items.")

        rows: list[dict[str, Any]] = []
        for i, entry in enumerate(index, 1):
            detail = await fetch_detail(client, entry["url"])
            raw_desc = detail.get("desc")
            if raw_desc:
                attunement, description = parse_magic_item_preamble(raw_desc)
                detail["desc"] = description
                if attunement is not None:
                    detail["requires_attunement"] = attunement
            rows.append(
                {
                    "slug": detail["index"],
                    "source_namespace": SRD_NAMESPACE,
                    "name": detail["name"],
                    "item_category": detail["equipment_category"]["index"],
                    "rarity": detail["rarity"]["name"].lower(),
                    "content": detail,
                    "content_source": SRD_CONTENT_SOURCE,
                }
            )
            print(
                f"\r  Fetching {i}/{total} — {detail['name']}\033[K",
                end="",
                flush=True,
            )
            if i < total:
                time.sleep(RATE_LIMIT_DELAY)

        print()  # newline after progress line

        print("→ Upserting magic items…")
        async with session_factory() as session:
            stmt = pg_insert(Item).values(rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=["slug", "source_namespace"],
                set_={
                    "name": stmt.excluded.name,
                    "item_category": stmt.excluded.item_category,
                    "rarity": stmt.excluded.rarity,
                    "content": stmt.excluded.content,
                    "content_source": stmt.excluded.content_source,
                    "updated_at": sa.text("NOW()"),
                },
            )
            await session.execute(stmt)
            await session.commit()

        print(f"✓ {total} magic items upserted.")
        _print_attribution()


# ---------------------------------------------------------------------------
# Link content into the SRD book
# ---------------------------------------------------------------------------

_SRD_BOOK_JOINS = (
    ("book_monsters", "monsters", "monster_id"),
    ("book_spells", "spells", "spell_id"),
    ("book_items", "items", "item_id"),
)


async def link_srd_book(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Ensure the system SRD book exists and holds all SRD content.

    Idempotent: the book is created once (matching migration 007), then any
    SRD content not already in it is added. Run after seeding so a fresh
    database -- where 007 created an empty book before content existed --
    ends up with the catalog linked.

    Args:
        session_factory: An async_sessionmaker for creating database sessions.

    Returns:
        None
    """
    print("→ Linking SRD content into the SRD book…")
    async with session_factory() as session:
        book_id = await session.scalar(
            sa.text("SELECT id FROM books WHERE slug = :slug").bindparams(
                slug=SRD_BOOK_SLUG
            )
        )
        if book_id is None:
            book_id = await session.scalar(
                sa.text(
                    "INSERT INTO books "
                    "(name, slug, description, is_public, is_system) "
                    "VALUES (:name, :slug, :description, true, true) "
                    "RETURNING id"
                ).bindparams(
                    name="SRD 5.1",
                    slug=SRD_BOOK_SLUG,
                    description=(
                        "The System Reference Document 5.1 catalog "
                        "(CC BY 4.0). Read-only."
                    ),
                )
            )
        # Table and column names come from the _SRD_BOOK_JOINS constant.
        for join_table, content_table, fk_col in _SRD_BOOK_JOINS:
            await session.execute(
                sa.text(
                    f"INSERT INTO {join_table} (book_id, {fk_col}) "  # noqa: S608
                    "SELECT :book_id, c.id "
                    f"FROM {content_table} c "
                    "WHERE c.source_namespace = :namespace "
                    "ON CONFLICT DO NOTHING"
                ).bindparams(book_id=book_id, namespace=SRD_NAMESPACE)
            )
        await session.commit()
    print("✓ SRD book linked.")


# ---------------------------------------------------------------------------
# Attribution notice
# ---------------------------------------------------------------------------


def _print_attribution() -> None:
    print()
    print("  Attribution:")
    print("  • Content: Wizards of the Coast LLC — SRD 5.1 (CC BY 4.0)")
    print("    https://creativecommons.org/licenses/by/4.0/")
    print("  • Data:    5e-bits/5e-database")
    print("    https://github.com/5e-bits/5e-database")
    print("  See scripts/SEED_ATTRIBUTION.md for full details.")
    print()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def main(targets: list[str]) -> None:
    """Main entry point for the seed script.

    Args:
        targets: A list of strings indicating which data to seed. Valid values
                 are "monsters", "spells", "items", or "all".

    Returns:
        None

    Usage:
        asyncio.run(main(["monsters", "spells"]))
        asyncio.run(main(["all"]))
    """
    session_factory = make_session_factory(settings.database_url)

    for target in targets:
        if target == "monsters":
            await seed_monsters(session_factory)
        elif target == "spells":
            await seed_spells(session_factory)
        elif target == "items":
            await seed_items(session_factory)
        else:
            print(
                f"✗ Unknown target: {target!r}. "
                "Currently supports: monsters, spells, items",
                file=sys.stderr,
            )
            sys.exit(1)

    # Keep the SRD book in sync with whatever content now exists.
    await link_srd_book(session_factory)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed SRD data from dnd5eapi.co."
    )
    parser.add_argument(
        "targets",
        nargs="+",
        choices=["monsters", "spells", "items", "all"],
        help="Which data to seed. 'all' seeds everything.",
    )
    args = parser.parse_args()

    targets: list[str] = (
        ["monsters", "spells", "items"]
        if "all" in args.targets
        else args.targets
    )
    asyncio.run(main(targets))

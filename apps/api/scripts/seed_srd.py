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
import sys
import time
from decimal import Decimal
from typing import Any

import httpx
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models import Monster

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_URL = "https://www.dnd5eapi.co/api/2014"
RATE_LIMIT_DELAY = 0.1  # seconds between detail requests — be polite

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
    engine = create_async_engine(database_url, echo=False)
    return async_sessionmaker(engine, expire_on_commit=False)


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


async def fetch_index(client: httpx.AsyncClient, path: str) -> list[dict[str, Any]]:
    """Fetch a full index listing, handling the {count, results} envelope."""
    resp = await client.get(f"{BASE_URL}{path}")
    resp.raise_for_status()
    data: dict[str, Any] = resp.json()
    return list(data["results"])


async def fetch_detail(client: httpx.AsyncClient, url: str) -> dict[str, Any]:
    """Fetch a single resource detail by its relative URL."""
    resp = await client.get(f"https://www.dnd5eapi.co{url}")
    resp.raise_for_status()
    result: dict[str, Any] = resp.json()
    return result


# ---------------------------------------------------------------------------
# CR display helper (used in progress output only)
# ---------------------------------------------------------------------------

_CR_DISPLAY: dict[Decimal, str] = {
    Decimal("0.125"): "1/8",
    Decimal("0.25"): "1/4",
    Decimal("0.5"): "1/2",
}


def cr_display(value: float | int) -> str:
    d = Decimal(str(value)).quantize(Decimal("0.001"))
    return _CR_DISPLAY.get(d, str(int(value) if value == int(value) else value))


# ---------------------------------------------------------------------------
# Seed: monsters
# ---------------------------------------------------------------------------


async def seed_monsters(session_factory: async_sessionmaker[AsyncSession]) -> None:
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
                    "name": detail["name"],
                    "monster_type": detail.get("type"),
                    "challenge_rating": Decimal(str(cr_raw)).quantize(Decimal("0.001")),
                    "content": detail,
                    "content_source": SRD_CONTENT_SOURCE,
                }
            )
            cr_str = cr_display(cr_raw)
            print(f"\r  Fetching {i}/{total} — {detail['name']} (CR {cr_str})", end="", flush=True)
            if i < total:
                time.sleep(RATE_LIMIT_DELAY)

    print()  # newline after progress line

    print("→ Upserting monsters…")
    async with session_factory() as session:
        stmt = pg_insert(Monster).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["slug"],
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


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def main(targets: list[str]) -> None:
    session_factory = make_session_factory(settings.database_url)

    for target in targets:
        if target == "monsters":
            await seed_monsters(session_factory)
        else:
            print(
                f"✗ Unknown target: {target!r}. Currently supports: monsters",
                file=sys.stderr,
            )
            sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed SRD data from dnd5eapi.co.")
    parser.add_argument(
        "targets",
        nargs="+",
        choices=["monsters", "spells", "items", "all"],
        help="Which data to seed. 'all' seeds everything.",
    )
    args = parser.parse_args()

    targets: list[str] = ["monsters", "spells", "items"] if "all" in args.targets else args.targets
    asyncio.run(main(targets))

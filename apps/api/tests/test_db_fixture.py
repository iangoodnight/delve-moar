"""Exercises the real-Postgres transactional test fixture.

Proves the ``db_session`` fixture both persists writes within a test and
rolls them back between tests, so suites stay isolated.
"""

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


async def test_db_session_persists_within_a_test(
    db_session: AsyncSession,
) -> None:
    db_session.add(User(email="fixture@example.com", password_hash="x"))
    await db_session.flush()

    count = await db_session.scalar(
        sa.select(sa.func.count()).select_from(User)
    )
    assert count == 1


async def test_db_session_rolls_back_between_tests(
    db_session: AsyncSession,
) -> None:
    # The previous test inserted a user; if rollback works we start clean
    # and can reuse the same unique email without a constraint violation.
    count = await db_session.scalar(
        sa.select(sa.func.count()).select_from(User)
    )
    assert count == 0

    db_session.add(User(email="fixture@example.com", password_hash="x"))
    await db_session.flush()
    count = await db_session.scalar(
        sa.select(sa.func.count()).select_from(User)
    )
    assert count == 1

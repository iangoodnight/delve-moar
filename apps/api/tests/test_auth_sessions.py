"""DB-backed tests for the session store."""

from datetime import UTC, datetime, timedelta

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.sessions import (
    create_session,
    resolve_session,
    revoke_all_for_user,
    revoke_session,
)
from app.auth.tokens import generate_token, hash_token
from app.config import settings
from app.models import Session, User


async def _make_user(db: AsyncSession, email: str = "user@example.com") -> User:
    user = User(
        username=email.split("@", 1)[0],
        email=email,
        password_hash="argon2-hash",
    )
    db.add(user)
    await db.flush()
    return user


async def test_create_session_stores_hash_not_token(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session)
    token = await create_session(db_session, user.id)

    stored = await db_session.scalar(sa.select(Session))
    assert stored is not None
    assert stored.token_hash == hash_token(token)
    assert stored.token_hash != token


async def test_resolve_returns_user_for_valid_token(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session)
    token = await create_session(db_session, user.id)

    resolved = await resolve_session(db_session, token)
    assert resolved is not None
    assert resolved.id == user.id


async def test_resolve_returns_none_for_unknown_token(
    db_session: AsyncSession,
) -> None:
    assert await resolve_session(db_session, generate_token()) is None


async def test_resolve_returns_none_for_expired_session(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session)
    token = await create_session(db_session, user.id)
    await db_session.execute(
        sa.update(Session).values(
            expires_at=datetime.now(UTC) - timedelta(seconds=1)
        )
    )
    await db_session.commit()

    assert await resolve_session(db_session, token) is None


async def test_resolve_slides_expiry_past_halflife(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session)
    token = await create_session(db_session, user.id)
    # Push expiry to just one minute out -- well under half the TTL.
    soon = datetime.now(UTC) + timedelta(minutes=1)
    await db_session.execute(sa.update(Session).values(expires_at=soon))
    await db_session.commit()

    assert await resolve_session(db_session, token) is not None

    refreshed = await db_session.scalar(sa.select(Session))
    assert refreshed is not None
    # Renewed to roughly now + full TTL, far beyond the one-minute mark.
    assert refreshed.expires_at > soon + timedelta(
        seconds=settings.session_ttl_seconds // 2
    )


async def test_revoke_session_deletes_only_that_row(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session)
    keep = await create_session(db_session, user.id)
    drop = await create_session(db_session, user.id)

    await revoke_session(db_session, drop)

    assert await resolve_session(db_session, drop) is None
    assert await resolve_session(db_session, keep) is not None


async def test_revoke_all_for_user_signs_out_everywhere(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session)
    one = await create_session(db_session, user.id)
    two = await create_session(db_session, user.id)

    await revoke_all_for_user(db_session, user.id)

    count = await db_session.scalar(
        sa.select(sa.func.count()).select_from(Session)
    )
    assert count == 0
    assert await resolve_session(db_session, one) is None
    assert await resolve_session(db_session, two) is None

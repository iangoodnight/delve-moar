"""Server-side session store: create, resolve, and revoke sessions.

The opaque token is only ever held by the client. Lookups go through the
token's SHA-256 digest. Resolving a session slides its expiry once it
passes the halfway point of its lifetime, so a valid session is renewed
without a database write on every request.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.tokens import generate_token, hash_token
from app.config import settings
from app.models import Session, User


async def create_session(db: AsyncSession, user_id: uuid.UUID) -> str:
    """Create a session for a user and return the raw opaque token.

    Args:
        db: Active database session.
        user_id: The owning user's id.

    Returns:
        The raw session token to set in the session cookie. Only its
        SHA-256 digest is persisted.
    """
    token = generate_token()
    now = datetime.now(UTC)
    db.add(
        Session(
            user_id=user_id,
            token_hash=hash_token(token),
            expires_at=now + timedelta(seconds=settings.session_ttl_seconds),
            last_used_at=now,
        )
    )
    await db.commit()
    return token


async def resolve_session(db: AsyncSession, raw_token: str) -> User | None:
    """Resolve a raw session token to its user, sliding the expiry.

    Args:
        db: Active database session.
        raw_token: The raw token from the session cookie.

    Returns:
        The authenticated ``User``, or ``None`` if the token is unknown or
        the session has expired.
    """
    session = await db.scalar(
        select(Session).where(Session.token_hash == hash_token(raw_token))
    )
    if session is None:
        return None

    now = datetime.now(UTC)
    if session.expires_at <= now:
        return None

    ttl = timedelta(seconds=settings.session_ttl_seconds)
    if session.expires_at - now < ttl / 2:
        session.expires_at = now + ttl
        session.last_used_at = now
        await db.commit()

    return await db.get(User, session.user_id)


async def revoke_session(db: AsyncSession, raw_token: str) -> None:
    """Delete the session matching a raw token, if any.

    Args:
        db: Active database session.
        raw_token: The raw token from the session cookie.
    """
    await db.execute(
        delete(Session).where(Session.token_hash == hash_token(raw_token))
    )
    await db.commit()


async def revoke_all_for_user(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Delete every session belonging to a user ("sign out everywhere").

    Args:
        db: Active database session.
        user_id: The user whose sessions to revoke.
    """
    await db.execute(delete(Session).where(Session.user_id == user_id))
    await db.commit()

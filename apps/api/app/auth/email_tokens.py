"""Issue, consume, and invalidate single-use email tokens.

Backs email verification and password reset (#171). As with sessions, the
raw token is only ever delivered to the user (by email); lookups go through
the token's SHA-256 digest. A token is single-use -- consuming it deletes
the row -- and expires after a per-purpose TTL.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.tokens import generate_token, hash_token
from app.models import EmailToken, EmailTokenPurpose, User


async def issue_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    purpose: EmailTokenPurpose,
    ttl_seconds: int,
) -> str:
    """Create an email token for a user and return the raw token.

    Args:
        db: Active database session.
        user_id: The user the token authenticates.
        purpose: What the token authorizes (verification or reset).
        ttl_seconds: Lifetime; the token expires this many seconds from now.

    Returns:
        The raw token to embed in the email link. Only its SHA-256 digest is
        persisted.
    """
    token = generate_token()
    now = datetime.now(UTC)
    db.add(
        EmailToken(
            user_id=user_id,
            token_hash=hash_token(token),
            purpose=purpose,
            expires_at=now + timedelta(seconds=ttl_seconds),
        )
    )
    await db.commit()
    return token


async def consume_token(
    db: AsyncSession,
    raw_token: str,
    purpose: EmailTokenPurpose,
) -> User | None:
    """Resolve and delete a single-use token, returning its user.

    A matched token is always deleted (single-use), even when expired, so a
    stale row never lingers and a replay finds nothing.

    Args:
        db: Active database session.
        raw_token: The raw token from the email link.
        purpose: The purpose the token must match.

    Returns:
        The token's ``User`` when the token was valid and unexpired;
        ``None`` if it was unknown, of the wrong purpose, or expired.
    """
    token = await db.scalar(
        select(EmailToken).where(
            EmailToken.token_hash == hash_token(raw_token),
            EmailToken.purpose == purpose,
        )
    )
    if token is None:
        return None

    # Capture before delete so the result does not depend on the session's
    # expire-on-commit behavior.
    expires_at = token.expires_at
    user_id = token.user_id
    await db.delete(token)
    await db.commit()

    if expires_at <= datetime.now(UTC):
        return None
    return await db.get(User, user_id)


async def invalidate_tokens(
    db: AsyncSession,
    user_id: uuid.UUID,
    purpose: EmailTokenPurpose,
) -> None:
    """Delete all of a user's tokens of a given purpose.

    Used after a successful verification or password change to retire any
    other outstanding tokens of that kind.

    Args:
        db: Active database session.
        user_id: The user whose tokens to clear.
        purpose: Which kind of token to delete.
    """
    await db.execute(
        delete(EmailToken).where(
            EmailToken.user_id == user_id,
            EmailToken.purpose == purpose,
        )
    )
    await db.commit()

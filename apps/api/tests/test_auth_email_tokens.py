"""Unit tests for the single-use email-token service over a real database."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.email_tokens import (
    consume_token,
    invalidate_tokens,
    issue_token,
)
from app.models import EmailToken, EmailTokenPurpose, User

VERIFY = EmailTokenPurpose.EMAIL_VERIFICATION
RESET = EmailTokenPurpose.PASSWORD_RESET


async def _make_user(db: AsyncSession, username: str, email: str) -> User:
    user = User(username=username, email=email, password_hash="x")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _token_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    count = await db.scalar(
        select(func.count())
        .select_from(EmailToken)
        .where(EmailToken.user_id == user_id)
    )
    return count or 0


async def test_issue_then_consume_returns_user(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session, "tokdm", "tok@example.com")
    raw = await issue_token(db_session, user.id, VERIFY, 3600)
    consumed = await consume_token(db_session, raw, VERIFY)
    assert consumed is not None
    assert consumed.id == user.id


async def test_consume_is_single_use(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "onced", "once@example.com")
    raw = await issue_token(db_session, user.id, VERIFY, 3600)
    assert await consume_token(db_session, raw, VERIFY) is not None
    assert await consume_token(db_session, raw, VERIFY) is None
    assert await _token_count(db_session, user.id) == 0


async def test_consume_wrong_purpose_keeps_token(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session, "wrongp", "wrong@example.com")
    raw = await issue_token(db_session, user.id, VERIFY, 3600)
    # A verification token cannot be redeemed as a reset token.
    assert await consume_token(db_session, raw, RESET) is None
    assert await _token_count(db_session, user.id) == 1


async def test_consume_expired_returns_none_and_deletes(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session, "expd", "exp@example.com")
    raw = await issue_token(db_session, user.id, RESET, -1)  # already expired
    assert await consume_token(db_session, raw, RESET) is None
    assert await _token_count(db_session, user.id) == 0


async def test_invalidate_clears_only_that_purpose(
    db_session: AsyncSession,
) -> None:
    user = await _make_user(db_session, "invd", "inv@example.com")
    await issue_token(db_session, user.id, VERIFY, 3600)
    await issue_token(db_session, user.id, VERIFY, 3600)
    reset_raw = await issue_token(db_session, user.id, RESET, 3600)
    await invalidate_tokens(db_session, user.id, VERIFY)
    assert await _token_count(db_session, user.id) == 1
    # The reset token survives and is still usable.
    assert await consume_token(db_session, reset_raw, RESET) is not None

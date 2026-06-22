"""Unit tests for book-access helper edge cases (#248).

The endpoint tests cover the main paths; these reach the defensive
branches the routers guard against (so the routes never exercise them).
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.books_access import assert_books_readable


async def test_assert_books_readable_empty_is_noop(
    db_session: AsyncSession,
) -> None:
    # No ids -> returns without a query or a 404; routers guard with `if book`.
    await assert_books_readable(db_session, [], None)

"""Account self-service endpoints: data export and account deletion (#280).

The signed-in user is the only actor here: both endpoints operate on their
own account, resolved through the ``get_current_user`` identity seam.
Deletion additionally re-authenticates with the current password, so a
stolen session cannot by itself destroy the account.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Response, status
from sqlalchemy import select

from app import mailer
from app.auth.cookies import clear_auth_cookies, set_auth_cookies
from app.auth.dependencies import CurrentUser, require_csrf
from app.auth.email_tokens import invalidate_tokens, issue_token
from app.auth.hashing import hash_password, verify_password
from app.auth.sessions import create_session, revoke_all_for_user
from app.config import settings
from app.db import DbSession
from app.exceptions import AppError
from app.models import (
    Book,
    BookItem,
    BookMonster,
    BookSpell,
    EmailTokenPurpose,
    User,
)
from app.rate_limit import enforce_email_change_rate_limit
from app.schemas.account import (
    AccountDeleteRequest,
    AccountExport,
    AccountExportBook,
    ChangeEmailRequest,
    ChangePasswordRequest,
)
from app.schemas.auth import UserResponse
from app.schemas.errors import ErrorResponse

router = APIRouter(prefix="/account", tags=["Account"])


def _incorrect_password() -> AppError:
    """Build the 403 returned when the deletion re-auth password is wrong.

    A 403 (not 401) because the caller is authenticated; they simply failed
    the extra confirmation this destructive action requires.
    """
    return AppError(
        status=status.HTTP_403_FORBIDDEN,
        developer_message="Re-authentication password is incorrect.",
        user_message="That password is incorrect.",
        error_code="INVALID_PASSWORD",
        more_info=f"{settings.public_url}/docs",
    )


def _email_taken(email: str) -> AppError:
    """Build the 409 when the requested email belongs to another account.

    Signup already discloses that an email is registered, so change-email
    matches that behavior rather than staying silent.
    """
    return AppError(
        status=status.HTTP_409_CONFLICT,
        developer_message=f"Email '{email}' is already registered.",
        user_message="That email is already registered.",
        error_code="EMAIL_TAKEN",
        more_info=f"{settings.public_url}/docs",
    )


def _email_unchanged() -> AppError:
    """Build the 409 when the requested email equals the current one."""
    return AppError(
        status=status.HTTP_409_CONFLICT,
        developer_message="Requested email matches the current address.",
        user_message="That is already your email address.",
        error_code="EMAIL_UNCHANGED",
        more_info=f"{settings.public_url}/docs",
    )


async def _book_content_ids(
    db: DbSession, book_id: uuid.UUID
) -> tuple[list[uuid.UUID], list[uuid.UUID], list[uuid.UUID]]:
    """Return the (monster, spell, item) ids collected in a book."""
    monster_ids = list(
        await db.scalars(
            select(BookMonster.monster_id).where(BookMonster.book_id == book_id)
        )
    )
    spell_ids = list(
        await db.scalars(
            select(BookSpell.spell_id).where(BookSpell.book_id == book_id)
        )
    )
    item_ids = list(
        await db.scalars(
            select(BookItem.item_id).where(BookItem.book_id == book_id)
        )
    )
    return monster_ids, spell_ids, item_ids


@router.get(
    "/export",
    response_model=AccountExport,
    summary="Export the current account's data",
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Not authenticated",
        },
    },
)
async def export_account(db: DbSession, user: CurrentUser) -> AccountExport:
    """Return a portable copy of the account record and its owned books.

    Books list their content by id, not inlined, so the export stays a
    record of what the user collected rather than a copy of the catalog.
    """
    books = list(
        await db.scalars(
            select(Book)
            .where(Book.owner_id == user.id)
            .order_by(Book.created_at)
        )
    )
    export_books: list[AccountExportBook] = []
    for book in books:
        monster_ids, spell_ids, item_ids = await _book_content_ids(db, book.id)
        export_books.append(
            AccountExportBook(
                id=book.id,
                name=book.name,
                slug=book.slug,
                description=book.description,
                is_public=book.is_public,
                is_system=book.is_system,
                created_at=book.created_at,
                updated_at=book.updated_at,
                monster_ids=monster_ids,
                spell_ids=spell_ids,
                item_ids=item_ids,
            )
        )
    return AccountExport(
        exported_at=datetime.now(UTC),
        account=UserResponse.from_user(user),
        books=export_books,
    )


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete the current account",
    dependencies=[Depends(require_csrf)],
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Not authenticated",
        },
        status.HTTP_403_FORBIDDEN: {
            "model": ErrorResponse,
            "description": "CSRF token or re-auth password invalid",
        },
    },
)
async def delete_account(
    payload: AccountDeleteRequest,
    response: Response,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Permanently delete the current account after a password re-check.

    On success the user row is removed and the database cascades every
    dependent record: sessions, email tokens, and the user's owned books
    (and, through the books, their content memberships). The public SRD
    system book has no owner, so it is untouched. The session and CSRF
    cookies are cleared, signing the browser out. This is irreversible.
    """
    if not await verify_password(user.password_hash, payload.password):
        raise _incorrect_password()
    await db.delete(user)
    await db.commit()
    clear_auth_cookies(response)


@router.put(
    "/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change the current account's password",
    dependencies=[Depends(require_csrf)],
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Not authenticated",
        },
        status.HTTP_403_FORBIDDEN: {
            "model": ErrorResponse,
            "description": "CSRF token or current password invalid",
        },
    },
)
async def change_password(
    payload: ChangePasswordRequest,
    response: Response,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Change the password after re-authenticating with the current one.

    On success every other session is revoked, so a password that leaked
    cannot keep riding an old session on another device, while this browser
    stays signed in on a fresh session. Any outstanding password-reset
    tokens are retired too.
    """
    if not await verify_password(user.password_hash, payload.current_password):
        raise _incorrect_password()
    user.password_hash = await hash_password(payload.new_password)
    await invalidate_tokens(db, user.id, EmailTokenPurpose.PASSWORD_RESET)
    await revoke_all_for_user(db, user.id)
    token = await create_session(db, user.id)
    set_auth_cookies(response, token)


@router.put(
    "/email",
    response_model=UserResponse,
    summary="Request a change to the current account's email",
    dependencies=[
        Depends(require_csrf),
        Depends(enforce_email_change_rate_limit),
    ],
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Not authenticated",
        },
        status.HTTP_403_FORBIDDEN: {
            "model": ErrorResponse,
            "description": "CSRF token or current password invalid",
        },
        status.HTTP_409_CONFLICT: {
            "model": ErrorResponse,
            "description": "Email already registered or unchanged",
        },
        status.HTTP_429_TOO_MANY_REQUESTS: {
            "model": ErrorResponse,
            "description": "Too many change-email requests",
        },
    },
)
async def change_email(
    payload: ChangeEmailRequest,
    db: DbSession,
    user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> UserResponse:
    """Stage a new email address and email it a confirmation link.

    The live email does not change yet: the address is stored as pending
    and a confirmation link is sent to it. It becomes the account's email
    only once that link is confirmed (POST /auth/email-change/confirm), so
    a mistyped address cannot capture the account. Requires the current
    password.
    """
    if not await verify_password(user.password_hash, payload.current_password):
        raise _incorrect_password()
    new_email = payload.new_email.lower()
    if new_email == user.email:
        raise _email_unchanged()
    taken = await db.scalar(select(User.id).where(User.email == new_email))
    if taken is not None:
        raise _email_taken(new_email)
    user.pending_email = new_email
    await invalidate_tokens(db, user.id, EmailTokenPurpose.EMAIL_CHANGE)
    token = await issue_token(
        db,
        user.id,
        EmailTokenPurpose.EMAIL_CHANGE,
        settings.email_change_ttl_seconds,
    )
    background_tasks.add_task(mailer.send_email_change_email, new_email, token)
    await db.refresh(user)
    return UserResponse.from_user(user)

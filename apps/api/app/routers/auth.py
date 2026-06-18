"""Authentication endpoints: signup, login, logout, lifecycle, current user."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Query,
    Request,
    Response,
    status,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app import mailer
from app.auth.csrf import generate_csrf_token
from app.auth.dependencies import CurrentUser, require_csrf
from app.auth.email_tokens import (
    consume_token,
    invalidate_tokens,
    issue_token,
)
from app.auth.hashing import (
    DUMMY_PASSWORD_HASH,
    hash_password,
    needs_rehash,
    verify_password,
)
from app.auth.sessions import (
    create_session,
    revoke_all_for_user,
    revoke_session,
)
from app.config import settings
from app.db import DbSession
from app.exceptions import AppError
from app.models import EmailTokenPurpose, User
from app.rate_limit import (
    enforce_login_rate_limit,
    enforce_password_reset_rate_limit,
    enforce_resend_verification_rate_limit,
    enforce_signup_rate_limit,
)
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    SignupRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.schemas.errors import ErrorResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


async def _issue_and_send_verification(
    db: AsyncSession, background_tasks: BackgroundTasks, user: User
) -> None:
    """Mint a fresh verification token and queue the verification email.

    Any outstanding verification tokens for the user are retired first so
    only the newest link works.

    Args:
        db: Active database session.
        background_tasks: Response background tasks to send the email on.
        user: The account to verify.
    """
    await invalidate_tokens(db, user.id, EmailTokenPurpose.EMAIL_VERIFICATION)
    token = await issue_token(
        db,
        user.id,
        EmailTokenPurpose.EMAIL_VERIFICATION,
        settings.email_verification_ttl_seconds,
    )
    background_tasks.add_task(mailer.send_verification_email, user.email, token)


def _set_auth_cookies(response: Response, session_token: str) -> None:
    """Set the HttpOnly session cookie and the readable CSRF cookie."""
    domain = settings.session_cookie_domain or None
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
        domain=domain,
    )
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=generate_csrf_token(),
        max_age=settings.session_ttl_seconds,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
        domain=domain,
    )


def _clear_auth_cookies(response: Response) -> None:
    """Delete the session and CSRF cookies on logout."""
    domain = settings.session_cookie_domain or None
    response.delete_cookie(
        settings.session_cookie_name, path="/", domain=domain
    )
    response.delete_cookie(settings.csrf_cookie_name, path="/", domain=domain)


def _invalid_credentials() -> AppError:
    """Build the uniform 401 used for any bad identifier or password."""
    return AppError(
        status=status.HTTP_401_UNAUTHORIZED,
        developer_message="Identifier or password is incorrect.",
        user_message="Invalid username/email or password.",
        error_code="INVALID_CREDENTIALS",
        more_info=f"{settings.public_url}/docs",
    )


def _invalid_token() -> AppError:
    """Build the uniform 400 used for any bad email token (verify or reset).

    The same response covers unknown, expired, and already-used tokens so a
    caller cannot probe which tokens ever existed.
    """
    return AppError(
        status=status.HTTP_400_BAD_REQUEST,
        developer_message="Email token is invalid, expired, or already used.",
        user_message=(
            "This link is invalid or has expired. Please request a new one."
        ),
        error_code="INVALID_TOKEN",
        more_info=f"{settings.public_url}/docs",
    )


async def _signup_conflict(
    db: AsyncSession, payload: SignupRequest
) -> AppError:
    """Attribute a signup unique-violation to the field that was taken.

    Runs only after a rollback on the conflict path, so the extra lookup is
    cheap. Querying the username (rather than inspecting the violated
    constraint's name) keeps the mapping robust across both the
    migration-built production schema and the metadata-built test schema,
    whose auto-generated constraint names differ. Username collisions are
    disclosed (the signup UX needs to tell the user the handle is taken);
    the email branch keeps #170's behavior, with #171 owning the
    enumeration-resistant alignment.

    Args:
        db: Session to re-check the username against (post-rollback).
        payload: The submitted signup payload.

    Returns:
        A 409 ``AppError`` whose ``error_code`` names the taken field.
    """
    username_taken = await db.scalar(
        select(User.id).where(User.username == payload.username)
    )
    if username_taken is not None:
        return AppError(
            status=status.HTTP_409_CONFLICT,
            developer_message=(
                f"Username '{payload.username}' is already taken."
            ),
            user_message="That username is taken.",
            error_code="USERNAME_TAKEN",
            more_info=f"{settings.public_url}/docs",
        )
    return AppError(
        status=status.HTTP_409_CONFLICT,
        developer_message=f"Email '{payload.email}' is already registered.",
        user_message="That email is already registered.",
        error_code="EMAIL_TAKEN",
        more_info=f"{settings.public_url}/docs",
    )


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account",
    dependencies=[Depends(enforce_signup_rate_limit)],
    responses={
        status.HTTP_409_CONFLICT: {
            "model": ErrorResponse,
            "description": "Username or email already registered",
        },
        status.HTTP_429_TOO_MANY_REQUESTS: {
            "model": ErrorResponse,
            "description": "Too many signup attempts",
        },
    },
)
async def signup(
    payload: SignupRequest,
    response: Response,
    db: DbSession,
    background_tasks: BackgroundTasks,
) -> UserResponse:
    """Create an account, start a session, and email a verification link."""
    user = User(
        username=payload.username,
        email=payload.email.lower(),
        password_hash=await hash_password(payload.password),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise await _signup_conflict(db, payload) from exc

    session_token = await create_session(db, user.id)
    await db.refresh(user)
    await _issue_and_send_verification(db, background_tasks, user)
    _set_auth_cookies(response, session_token)
    return UserResponse.from_user(user)


@router.post(
    "/login",
    response_model=UserResponse,
    summary="Log in",
    dependencies=[Depends(enforce_login_rate_limit)],
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Invalid credentials",
        },
        status.HTTP_429_TOO_MANY_REQUESTS: {
            "model": ErrorResponse,
            "description": "Too many login attempts",
        },
    },
)
async def login(
    payload: LoginRequest, response: Response, db: DbSession
) -> UserResponse:
    """Log in with a username or email and password.

    The identifier matches email when it contains "@" and username
    otherwise; both are case-insensitive. Sets the session and CSRF
    cookies.
    """
    identifier = payload.identifier.lower()
    field = User.email if "@" in identifier else User.username
    user = await db.scalar(select(User).where(field == identifier))
    if user is None:
        # Verify against a dummy hash so timing does not reveal whether the
        # email is registered.
        await verify_password(DUMMY_PASSWORD_HASH, payload.password)
        raise _invalid_credentials()
    if not await verify_password(user.password_hash, payload.password):
        raise _invalid_credentials()

    if needs_rehash(user.password_hash):
        user.password_hash = await hash_password(payload.password)
        await db.commit()

    token = await create_session(db, user.id)
    _set_auth_cookies(response, token)
    return UserResponse.from_user(user)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Log out",
    dependencies=[Depends(require_csrf)],
)
async def logout(
    request: Request,
    response: Response,
    db: DbSession,
    user: CurrentUser,
    everywhere: Annotated[  # noqa: FBT002
        bool,
        Query(description="Revoke all of this user's sessions, not just this."),
    ] = False,
) -> None:
    """Revoke the current session (or all sessions) and clear the cookies."""
    if everywhere:
        await revoke_all_for_user(db, user.id)
    else:
        token = request.cookies.get(settings.session_cookie_name)
        if token:
            await revoke_session(db, token)
    _clear_auth_cookies(response)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the current user",
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Not authenticated",
        },
    },
)
async def me(user: CurrentUser) -> UserResponse:
    """Return the currently authenticated user."""
    return UserResponse.from_user(user)


@router.post(
    "/verify-email",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Confirm an email address",
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "model": ErrorResponse,
            "description": "Token is invalid or expired",
        },
    },
)
async def verify_email(payload: VerifyEmailRequest, db: DbSession) -> None:
    """Mark a user's email as verified using a verification token.

    Unauthenticated: possession of the emailed token is the proof, and
    the token is single-use.
    """
    user = await consume_token(
        db, payload.token, EmailTokenPurpose.EMAIL_VERIFICATION
    )
    if user is None:
        raise _invalid_token()
    user.email_verified_at = datetime.now(UTC)
    await invalidate_tokens(db, user.id, EmailTokenPurpose.EMAIL_VERIFICATION)


@router.post(
    "/resend-verification",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Resend the verification email",
    dependencies=[
        Depends(require_csrf),
        Depends(enforce_resend_verification_rate_limit),
    ],
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Not authenticated",
        },
        status.HTTP_403_FORBIDDEN: {
            "model": ErrorResponse,
            "description": "CSRF token missing or invalid",
        },
        status.HTTP_429_TOO_MANY_REQUESTS: {
            "model": ErrorResponse,
            "description": "Too many resend attempts",
        },
    },
)
async def resend_verification(
    db: DbSession, user: CurrentUser, background_tasks: BackgroundTasks
) -> None:
    """Send a fresh verification email to the signed-in user.

    A no-op (still 204) when already verified. Takes no email input, so
    it cannot be used to probe account existence.
    """
    if user.email_verified_at is not None:
        return
    await _issue_and_send_verification(db, background_tasks, user)


@router.post(
    "/password-reset",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=MessageResponse,
    summary="Request a password reset",
    dependencies=[Depends(enforce_password_reset_rate_limit)],
    responses={
        status.HTTP_429_TOO_MANY_REQUESTS: {
            "model": ErrorResponse,
            "description": "Too many reset requests",
        },
    },
)
async def request_password_reset(
    payload: PasswordResetRequest,
    db: DbSession,
    background_tasks: BackgroundTasks,
) -> MessageResponse:
    """Email a password-reset link if the identifier matches an account.

    The response is identical whether or not an account matched, so it
    never discloses which usernames or emails are registered.
    """
    identifier = payload.identifier.lower()
    field = User.email if "@" in identifier else User.username
    user = await db.scalar(select(User).where(field == identifier))
    if user is not None:
        await invalidate_tokens(db, user.id, EmailTokenPurpose.PASSWORD_RESET)
        token = await issue_token(
            db,
            user.id,
            EmailTokenPurpose.PASSWORD_RESET,
            settings.password_reset_ttl_seconds,
        )
        background_tasks.add_task(
            mailer.send_password_reset_email, user.email, token
        )
    return MessageResponse(
        message="If that account exists, a reset link is on its way."
    )


@router.post(
    "/password-reset/confirm",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Set a new password with a reset token",
    responses={
        status.HTTP_400_BAD_REQUEST: {
            "model": ErrorResponse,
            "description": "Token is invalid or expired",
        },
    },
)
async def confirm_password_reset(
    payload: PasswordResetConfirmRequest, db: DbSession
) -> None:
    """Set a new password using a reset token and sign the user out.

    On success the password is rehashed, every reset token is retired,
    and all of the user's sessions are revoked, so a thief holding an old
    session is locked out. Receiving the reset email proves control of
    the address, so an unverified account is verified at the same time.
    The user is not logged in; they sign in fresh with the new password.
    """
    user = await consume_token(
        db, payload.token, EmailTokenPurpose.PASSWORD_RESET
    )
    if user is None:
        raise _invalid_token()
    user.password_hash = await hash_password(payload.password)
    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(UTC)
    await invalidate_tokens(db, user.id, EmailTokenPurpose.PASSWORD_RESET)
    await revoke_all_for_user(db, user.id)

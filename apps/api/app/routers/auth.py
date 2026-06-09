"""Authentication endpoints: signup, login, logout, and current user."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.auth.csrf import generate_csrf_token
from app.auth.dependencies import CurrentUser, require_csrf
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
from app.models import User
from app.schemas.auth import LoginRequest, SignupRequest, UserResponse
from app.schemas.errors import ErrorResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


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
    """Build the uniform 401 used for both bad email and bad password."""
    return AppError(
        status=status.HTTP_401_UNAUTHORIZED,
        developer_message="Email or password is incorrect.",
        user_message="Invalid email or password.",
        error_code="INVALID_CREDENTIALS",
        more_info=f"{settings.public_url}/docs",
    )


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account",
    responses={
        status.HTTP_409_CONFLICT: {
            "model": ErrorResponse,
            "description": "Email already registered",
        },
    },
)
async def signup(
    payload: SignupRequest, response: Response, db: DbSession
) -> UserResponse:
    """Create a new account and start a session.

    Args:
        payload: Email and password for the new account.
        response: Response used to set the session and CSRF cookies.
        db: Database session.

    Returns:
        The created user.

    Raises:
        AppError: 409 if the email is already registered.
    """
    user = User(
        email=payload.email.lower(),
        password_hash=await hash_password(payload.password),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError(
            status=status.HTTP_409_CONFLICT,
            developer_message=f"Email '{payload.email}' is already registered.",
            user_message="That email is already registered.",
            error_code="EMAIL_TAKEN",
            more_info=f"{settings.public_url}/docs",
        ) from exc

    token = await create_session(db, user.id)
    await db.refresh(user)
    _set_auth_cookies(response, token)
    return UserResponse.from_user(user)


@router.post(
    "/login",
    response_model=UserResponse,
    summary="Log in",
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Invalid credentials",
        },
    },
)
async def login(
    payload: LoginRequest, response: Response, db: DbSession
) -> UserResponse:
    """Authenticate with email and password and start a session.

    Args:
        payload: Email and password.
        response: Response used to set the session and CSRF cookies.
        db: Database session.

    Returns:
        The authenticated user.

    Raises:
        AppError: 401 if the email or password is incorrect.
    """
    user = await db.scalar(
        select(User).where(User.email == payload.email.lower())
    )
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
    """Revoke the current session (or all the user's) and clear cookies.

    Args:
        request: Request carrying the session cookie.
        response: Response used to clear the cookies.
        db: Database session.
        user: The authenticated user; also enforces a valid session.
        everywhere: When true, revoke every session for the user.
    """
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
    """Return the currently authenticated user.

    Args:
        user: The authenticated user, resolved from the session cookie.

    Returns:
        The current user.
    """
    return UserResponse.from_user(user)

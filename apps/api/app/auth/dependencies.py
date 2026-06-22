"""FastAPI auth dependencies: the identity seam and CSRF enforcement."""

from typing import Annotated

from fastapi import Depends, Request, status

from app.auth.csrf import tokens_match
from app.auth.sessions import resolve_session
from app.config import settings
from app.db import DbSession
from app.exceptions import AppError
from app.models import User

# Header the SPA echoes the CSRF cookie value back in (double-submit).
CSRF_HEADER_NAME = "X-CSRF-Token"


async def get_optional_user(request: Request, db: DbSession) -> User | None:
    """Resolve the user from the session cookie, or ``None`` if unauthenticated.

    The unauthenticated counterpart to ``get_current_user``: it never raises,
    so public endpoints (e.g. SRD browse) can personalize their response when a
    session is present and fall back to the anonymous view otherwise.

    Args:
        request: The incoming request, carrying the session cookie.
        db: Active database session.

    Returns:
        The authenticated ``User``, or ``None`` when no valid session exists.
    """
    token = request.cookies.get(settings.session_cookie_name)
    return await resolve_session(db, token) if token else None


async def get_current_user(request: Request, db: DbSession) -> User:
    """Resolve the authenticated user from the session cookie.

    The single identity seam (ADR 0010): endpoints depend on this and never
    read the session cookie directly, so adding OAuth later is an additive
    change behind this function.

    Args:
        request: The incoming request, carrying the session cookie.
        db: Active database session.

    Returns:
        The authenticated ``User``.

    Raises:
        AppError: 401 if the session cookie is missing, unknown, or expired.
    """
    user = await get_optional_user(request, db)
    if user is None:
        raise AppError(
            status=status.HTTP_401_UNAUTHORIZED,
            developer_message="Missing or invalid session.",
            user_message="You are not signed in.",
            error_code="UNAUTHENTICATED",
            more_info=f"{settings.public_url}/docs",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalCurrentUser = Annotated[User | None, Depends(get_optional_user)]


async def require_csrf(request: Request) -> None:
    """Enforce the double-submit CSRF check on state-changing requests.

    Compares the CSRF cookie with the value echoed in the request header.
    Apply to cookie-authenticated POST/PUT/PATCH/DELETE endpoints.

    Args:
        request: The incoming request.

    Raises:
        AppError: 403 if the CSRF cookie and header are missing or differ.
    """
    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    header_token = request.headers.get(CSRF_HEADER_NAME)
    if not tokens_match(cookie_token, header_token):
        raise AppError(
            status=status.HTTP_403_FORBIDDEN,
            developer_message="CSRF token missing or invalid.",
            user_message="Your session could not be verified. Please retry.",
            error_code="CSRF_FAILED",
            more_info=f"{settings.public_url}/docs",
        )


RequireCsrf = Annotated[None, Depends(require_csrf)]

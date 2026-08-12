"""IP-based rate limiting for auth endpoints (ADR 0010 threat model).

A thin seam over the ``limits`` library: ``limits`` owns the window
algorithm and storage, while this module owns client-IP keying, the
FastAPI dependency wiring, and translating a refused request into the
app's standard 429 error. Endpoints opt in the same way they opt into
CSRF -- by listing the dependency in their route ``dependencies=[...]``.

Storage is in-process memory by default, which is correct for the current
single-process deploy. Set ``RATE_LIMIT_STORAGE_URI`` to an
``async+redis://`` URL to share counters across machines if the API is
ever scaled horizontally.
"""

import math
import time

from fastapi import Request, status
from limits import RateLimitItem, parse
from limits.aio.storage import Storage
from limits.aio.strategies import MovingWindowRateLimiter
from limits.storage import storage_from_string

from app.config import settings
from app.exceptions import AppError


def _build_storage() -> Storage:
    """Build the async rate-limit storage from the configured URI.

    Returns:
        An async ``limits`` storage backend.

    Raises:
        RuntimeError: If the configured URI selects a synchronous backend
            (the limiter is async; ``RATE_LIMIT_STORAGE_URI`` must use an
            ``async+`` scheme such as ``async+memory://``).
    """
    # storage_from_string returns a sync-or-async union; the moving-window
    # limiter is async, so require the async variant up front.
    storage = storage_from_string(settings.rate_limit_storage_uri)
    if not isinstance(storage, Storage):
        raise RuntimeError(
            "RATE_LIMIT_STORAGE_URI must select an async backend "
            "(e.g. 'async+memory://')."
        )
    return storage


# Built once at import. The moving-window strategy gives an accurate rolling
# limit rather than a fixed-bucket one that resets on window boundaries.
_storage = _build_storage()
_limiter = MovingWindowRateLimiter(_storage)


def client_ip(request: Request) -> str:
    """Resolve the originating client IP for rate-limit keying.

    Behind Fly's proxy ``request.client.host`` is the proxy's internal
    address, so every caller would share one bucket. Fly sets the true
    client IP in ``Fly-Client-IP``; a standard ``X-Forwarded-For`` is the
    next-best signal, and the direct peer address is the local-dev
    fallback.

    Args:
        request: The incoming request.

    Returns:
        The client IP, or ``"unknown"`` if none can be determined.
    """
    fly_ip = request.headers.get("Fly-Client-IP")
    if fly_ip:
        return fly_ip
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return "unknown"


async def _enforce(request: Request, *, scope: str, limit: str) -> None:
    """Consume one unit of the ``scope`` budget for the caller's IP.

    A no-op when rate limiting is disabled. Otherwise records a hit against
    the moving window and raises a 429 once the budget is spent, attaching a
    ``Retry-After`` header derived from the window reset time.

    Args:
        request: The incoming request, used to derive the client IP.
        scope: Budget namespace (e.g. ``"login"``) so endpoints with
            different limits do not share a counter.
        limit: A ``limits``-notation budget, e.g. ``"10/minute"``.

    Raises:
        AppError: 429 if the caller has exhausted the budget.
    """
    if not settings.rate_limit_enabled:
        return
    item: RateLimitItem = parse(limit)
    key = f"{scope}:{client_ip(request)}"
    if await _limiter.hit(item, key):
        return
    stats = await _limiter.get_window_stats(item, key)
    retry_after = max(1, math.ceil(stats.reset_time - time.time()))
    raise AppError(
        status=status.HTTP_429_TOO_MANY_REQUESTS,
        developer_message=f"Rate limit exceeded for scope '{scope}'.",
        user_message="Too many attempts. Please wait a moment and try again.",
        error_code="RATE_LIMITED",
        more_info=f"{settings.public_url}/docs",
        headers={"Retry-After": str(retry_after)},
    )


async def enforce_login_rate_limit(request: Request) -> None:
    """Rate-limit dependency for the login endpoint (anti-brute-force)."""
    await _enforce(request, scope="login", limit=settings.rate_limit_login)


async def enforce_signup_rate_limit(request: Request) -> None:
    """Rate-limit dependency for the signup endpoint (anti-abuse)."""
    await _enforce(request, scope="signup", limit=settings.rate_limit_signup)


async def enforce_password_reset_rate_limit(request: Request) -> None:
    """Rate-limit dependency for the password-reset request endpoint.

    Caps how often a single IP can trigger reset emails, blunting attempts
    to flood a victim's inbox.
    """
    await _enforce(
        request,
        scope="password_reset",
        limit=settings.rate_limit_password_reset,
    )


async def enforce_resend_verification_rate_limit(request: Request) -> None:
    """Rate-limit dependency for the resend-verification endpoint.

    Same anti mail-bombing intent as the password-reset limiter.
    """
    await _enforce(
        request,
        scope="resend_verification",
        limit=settings.rate_limit_resend_verification,
    )


async def enforce_email_change_rate_limit(request: Request) -> None:
    """Rate-limit dependency for the change-email request endpoint.

    Same anti mail-bombing intent as the password-reset limiter: caps how
    often one IP can send confirmation emails to a chosen address.
    """
    await _enforce(
        request,
        scope="email_change",
        limit=settings.rate_limit_email_change,
    )


async def enforce_campaign_invite_rate_limit(request: Request) -> None:
    """Rate-limit dependency for creating campaign invites (#176).

    An invite resolves a public handle to an account, so capping how often one
    IP can create invites blunts both handle enumeration and invite-spam
    against a chosen victim.
    """
    await _enforce(
        request,
        scope="campaign_invite",
        limit=settings.rate_limit_campaign_invite,
    )


async def reset_rate_limits() -> None:
    """Clear all rate-limit counters.

    Intended for test isolation so the shared in-process store does not leak
    state between tests. Not used in normal request handling.
    """
    await _storage.reset()

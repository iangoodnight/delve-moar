"""Session and CSRF cookie helpers.

Shared by every endpoint that starts or ends a session: signup and login
set the pair, logout and account deletion clear it. Centralizing the
``domain``/``secure``/``samesite`` attributes keeps the cross-subdomain
cookie contract (web on the apex, API on a subdomain) in one place.
"""

from fastapi import Response

from app.auth.csrf import generate_csrf_token
from app.config import settings


def set_auth_cookies(response: Response, session_token: str) -> None:
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


def clear_auth_cookies(response: Response) -> None:
    """Delete the session and CSRF cookies (logout, account deletion)."""
    domain = settings.session_cookie_domain or None
    response.delete_cookie(
        settings.session_cookie_name, path="/", domain=domain
    )
    response.delete_cookie(settings.csrf_cookie_name, path="/", domain=domain)

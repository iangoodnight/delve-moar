"""Double-submit-cookie CSRF helpers.

On login the server sets a readable (non-HttpOnly) CSRF cookie. The SPA
echoes its value in a request header on state-changing requests; the
server confirms the two match. An attacker on another origin cannot read
the cookie to forge the header, so cross-site requests fail the check.
The FastAPI dependency that enforces this lives in ``app.auth.dependencies``.
"""

import secrets

# 32 random bytes = 256 bits of entropy, URL-safe base64 encoded.
_CSRF_BYTES = 32


def generate_csrf_token() -> str:
    """Return a new random token for the CSRF double-submit cookie."""
    return secrets.token_urlsafe(_CSRF_BYTES)


def tokens_match(cookie_token: str | None, header_token: str | None) -> bool:
    """Constant-time compare the CSRF cookie and header values.

    Args:
        cookie_token: Value of the CSRF cookie sent by the browser.
        header_token: Value echoed back in the request header.

    Returns:
        ``True`` only if both are present and equal; ``False`` if either is
        missing or they differ.
    """
    if not cookie_token or not header_token:
        return False
    return secrets.compare_digest(cookie_token, header_token)

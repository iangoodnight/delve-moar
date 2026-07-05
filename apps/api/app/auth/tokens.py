"""Opaque session-token generation and hashing.

The raw token is handed to the client in an HttpOnly cookie; only its
SHA-256 digest is stored in the ``sessions`` table, so a database leak
does not expose live sessions.
"""

import hashlib
import secrets

# 32 random bytes = 256 bits of entropy, URL-safe base64 encoded.
_TOKEN_BYTES = 32


def generate_token() -> str:
    """Return a new high-entropy, URL-safe opaque session token."""
    return secrets.token_urlsafe(_TOKEN_BYTES)


def hash_token(token: str) -> str:
    """Return the SHA-256 hex digest of a session token.

    Args:
        token: The raw opaque token.

    Returns:
        A 64-character lowercase hex SHA-256 digest, suitable for the
        ``sessions.token_hash`` column.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

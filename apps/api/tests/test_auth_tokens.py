"""Unit tests for opaque session tokens."""

import re

from app.auth.tokens import generate_token, hash_token


def test_generate_token_is_unique() -> None:
    assert generate_token() != generate_token()


def test_generate_token_is_urlsafe_and_long() -> None:
    token = generate_token()
    assert len(token) >= 43  # 32 bytes, base64url, unpadded
    assert re.fullmatch(r"[A-Za-z0-9_-]+", token)


def test_hash_token_is_deterministic_sha256_hex() -> None:
    digest = hash_token("fixed-token")
    assert digest == hash_token("fixed-token")
    assert re.fullmatch(r"[0-9a-f]{64}", digest)


def test_hash_token_differs_per_token() -> None:
    assert hash_token("a") != hash_token("b")

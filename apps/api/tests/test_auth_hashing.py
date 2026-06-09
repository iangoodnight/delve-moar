"""Unit tests for argon2id password hashing."""

from app.auth.hashing import hash_password, needs_rehash, verify_password


async def test_hash_and_verify_roundtrip() -> None:
    hashed = await hash_password("correct horse battery staple")
    assert await verify_password(hashed, "correct horse battery staple")


async def test_verify_rejects_wrong_password() -> None:
    hashed = await hash_password("correct horse battery staple")
    assert await verify_password(hashed, "Tr0ub4dour") is False


async def test_hash_is_salted_and_unique() -> None:
    a = await hash_password("same-password")
    b = await hash_password("same-password")
    assert a != b
    assert a.startswith("$argon2id$")


async def test_fresh_hash_does_not_need_rehash() -> None:
    hashed = await hash_password("whatever")
    assert needs_rehash(hashed) is False

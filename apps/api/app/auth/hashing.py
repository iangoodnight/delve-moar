"""Password hashing with argon2id.

Wraps a single configured ``PasswordHasher``. Hashing and verification are
CPU-bound, so they run in a threadpool to avoid blocking the event loop.
Parameters come from config (ADR 0010) and can be tuned without a code
change; ``needs_rehash`` lets callers upgrade stored hashes on login.
"""

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi.concurrency import run_in_threadpool

from app.config import settings

_hasher = PasswordHasher(
    time_cost=settings.argon2_time_cost,
    memory_cost=settings.argon2_memory_cost,
    parallelism=settings.argon2_parallelism,
)

# A precomputed hash used to equalize login timing when an account does not
# exist, so the response time does not reveal whether an email is
# registered. Verified against (and always failing) on the no-such-user path.
DUMMY_PASSWORD_HASH = _hasher.hash("delve-moar-nonexistent-account")


async def hash_password(password: str) -> str:
    """Hash a plaintext password with argon2id.

    Args:
        password: The plaintext password to hash.

    Returns:
        The argon2id encoded hash (includes algorithm, params, and salt).
    """
    return await run_in_threadpool(_hasher.hash, password)


async def verify_password(password_hash: str, password: str) -> bool:
    """Verify a plaintext password against a stored argon2id hash.

    Args:
        password_hash: The stored argon2id encoded hash.
        password: The plaintext password to check.

    Returns:
        ``True`` if the password matches, ``False`` if it does not.
    """

    def _verify() -> bool:
        try:
            _hasher.verify(password_hash, password)
        except VerifyMismatchError:
            return False
        return True

    return await run_in_threadpool(_verify)


def needs_rehash(password_hash: str) -> bool:
    """Report whether a stored hash should be upgraded to current params.

    Args:
        password_hash: The stored argon2id encoded hash.

    Returns:
        ``True`` if the hash was produced with weaker parameters than the
        current configuration and should be re-hashed on next login.
    """
    return _hasher.check_needs_rehash(password_hash)

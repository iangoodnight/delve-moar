"""Database engine and session dependency management."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

_factory: async_sessionmaker[AsyncSession] | None = None


def init_db(database_url: str) -> None:
    """Initialize the async database engine and session factory.

    Must be called once at application startup before any request is handled.
    Subsequent calls overwrite the existing factory.

    Args:
        database_url: The asyncpg-compatible database connection URL.

    Usage:
        init_db("postgresql+asyncpg://user:password@localhost/dbname")
    """
    global _factory
    engine = create_async_engine(database_url, echo=False)
    _factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session for request handlers.

    This is intended to be used as a FastAPI dependency. It yields a session
    that is automatically closed after the request is processed.

    Yields:
        An active AsyncSession connected to the database.

    Raises:
        RuntimeError: If the database session factory has not been initialized.
    """
    factory = _factory
    if factory is None:
        raise RuntimeError(
            "DB not initialized -- call init_db() before handling requests"
        )
    async with factory() as session:
        yield session


DbSession = Annotated[AsyncSession, Depends(get_session)]

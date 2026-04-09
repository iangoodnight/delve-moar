"""SQLAlchemy declarative base shared by all ORM models."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared base class — all models inherit from this.

    Provides a unified metadata registry used by Alembic migrations.
    """

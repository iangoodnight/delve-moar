"""Application settings loaded from environment variables and .env file."""

import tomllib
from pathlib import Path
from typing import Annotated

from pydantic import AfterValidator, BeforeValidator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve paths relative to this file so settings work regardless of the
# current working directory (seed scripts, test runners, container, etc.).
_API_ROOT = Path(__file__).parent.parent  # apps/api/
_PROJECT_ROOT = _API_ROOT.parent.parent  # repo root (dungeon-master/)

# Search order: project-root .env first, then an api-local override if present.
# pydantic-settings applies files left-to-right; later values win, so the
# api-local file can override individual keys without replacing the whole file.
_ENV_FILES = [_PROJECT_ROOT / ".env", _API_ROOT / ".env"]


def _read_version() -> str:
    """Read version from pyproject.toml when present, fall back to 'dev'.

    The container sets VERSION via the environment; pyproject.toml is only
    present during local development.  Either source is fine — pydantic-settings
    will prefer the env var over this default when VERSION is set.
    """
    pyproject = _API_ROOT / "pyproject.toml"
    if pyproject.is_file():
        with pyproject.open("rb") as fh:
            return str(tomllib.load(fh)["project"]["version"])
    return "dev"


def _coerce_database_url(value: str) -> str:
    """Rewrite bare postgres:// URLs to the asyncpg dialect.

    ``fly postgres attach`` sets DATABASE_URL as ``postgres://...``.
    SQLAlchemy + asyncpg requires ``postgresql+asyncpg://...``.
    """
    if value.startswith("postgres://"):
        return "postgresql+asyncpg://" + value[len("postgres://") :]
    return value


def _parse_csv_list(value: str | list[str]) -> list[str]:
    """Coerce a CSV env-var value into a list of trimmed, non-empty strings.

    Pydantic-settings reads env vars as strings, but some settings are more
    ergonomic as lists. Lists require JSON syntax by default, which is awkward
    in shells. Accepting CSV makes
    ``CORS_ALLOWED_ORIGINS="http://a.com, http://b.com"``
    just work. When the default (already a list flows through), return it
    unchanged.

    Args:
        value: A string from an environment variable, or a default list.

    Returns:
        A list of strings, split and trimmed if the input was a string.

    Examples:
        >>> _parse_csv_list("a, b, c")
        ['a', 'b', 'c']
        >>> _parse_csv_list("  a  ,  b  ,  c  ")
        ['a', 'b', 'c']
        >>> _parse_csv_list("a,b,,c,")
        ['a', 'b', 'c']
        >>> _parse_csv_list(["a", "b", "c"])
        ['a', 'b', 'c']
    """
    if isinstance(value, list):
        return value
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseSettings):
    """API configuration -- values are read from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        case_sensitive=False,
        # Root .env is shared with postgres/web — ignore unknown keys.
        extra="ignore",
    )

    cors_allowed_origins: Annotated[
        list[str],
        BeforeValidator(_parse_csv_list),
    ] = ["http://localhost:5173"]
    database_url: Annotated[str, AfterValidator(_coerce_database_url)] = (
        "postgresql+asyncpg://UNSET:UNSET@localhost:5432/UNSET"
    )
    env: str = "development"
    version: str = _read_version()
    public_url: str = "http://localhost:8000"


settings = Settings()

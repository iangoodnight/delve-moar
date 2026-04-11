"""Application settings loaded from environment variables and .env file."""

import tomllib
from pathlib import Path

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


class Settings(BaseSettings):
    """API configuration -- values are read from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        case_sensitive=False,
        # Root .env is shared with postgres/web — ignore unknown keys.
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://UNSET:UNSET@localhost:5432/UNSET"
    env: str = "development"
    version: str = _read_version()
    public_url: str = "http://localhost:8000"


settings = Settings()

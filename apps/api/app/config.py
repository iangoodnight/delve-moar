"""Application settings loaded from environment variables and .env file."""

import tomllib
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _read_version() -> str:
    """Read version from pyproject.toml when present, fall back to 'dev'.

    The container sets VERSION via the environment; pyproject.toml is only
    present during local development.  Either source is fine — pydantic-settings
    will prefer the env var over this default when VERSION is set.
    """
    pyproject = Path(__file__).parent.parent / "pyproject.toml"
    if pyproject.is_file():
        with pyproject.open("rb") as fh:
            return str(tomllib.load(fh)["project"]["version"])
    return "dev"


class Settings(BaseSettings):
    """API configuration -- values are read from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    database_url: str = "postgresql+asyncpg://UNSET:UNSET@localhost:5432/UNSET"
    env: str = "development"
    version: str = _read_version()
    public_url: str = "http://localhost:8000"


settings = Settings()

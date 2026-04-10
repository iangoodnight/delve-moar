"""Application settings loaded from environment variables and .env file."""

import tomllib
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_pyproject = Path(__file__).parent.parent / "pyproject.toml"
with _pyproject.open("rb") as _f:
    _VERSION: str = tomllib.load(_f)["project"]["version"]


class Settings(BaseSettings):
    """API configuration -- values are read from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    database_url: str = "postgresql+asyncpg://UNSET:UNSET@localhost:5432/UNSET"
    env: str = "development"
    version: str = _VERSION
    public_url: str = "http://localhost:8000"


settings = Settings()

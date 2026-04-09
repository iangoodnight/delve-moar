from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    database_url: str = "postgresql+asyncpg://dm:dm_secret@localhost:5432/delve_moar"
    env: str = "development"
    version: str = "0.0.1"


settings = Settings()

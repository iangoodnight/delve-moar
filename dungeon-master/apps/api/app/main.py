from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.config import settings
from app.routers import health

_engine: AsyncEngine | None = None


def get_engine() -> AsyncEngine:
    if _engine is None:
        raise RuntimeError("Database engine is not initialized")
    return _engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global _engine
    _engine = create_async_engine(settings.database_url, echo=settings.env == "development")
    yield
    await _engine.dispose()
    _engine = None


app = FastAPI(
    title="Dungeon Master API",
    version=settings.version,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.include_router(health.router)

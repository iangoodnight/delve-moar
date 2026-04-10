"""FastAPI application factory and lifespan configuration."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.exceptions import register_exception_handlers
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown.

    DB engine init and teardown will be wired here once endpoints that
    need a live connection are introduced.
    """
    yield


app = FastAPI(
    title="Delve Moar API",
    version=settings.version,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

register_exception_handlers(app)

# /health is intentionally outside /v1 -- it is infrastructure, not a resource.
app.include_router(health.router)

# Resource routers are mounted under /v1.
# Routers for monsters, spells, and items will be added in #40-#42.

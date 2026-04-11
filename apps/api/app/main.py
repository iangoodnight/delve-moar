"""FastAPI application factory and lifespan configuration."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.db import init_db
from app.exceptions import register_exception_handlers
from app.routers import health, monsters, spells

V1_PREFIX = "/v1"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown.

    Initializes the database engine on startup. Teardown logic for a
    gracefull connection pool shutdown will be added here as needed

    Args:
        app: The FastAPI application instance.

    Returns:
        An async generator yielding control back to FastAPI after startup tasks.
    """
    init_db(settings.database_url)
    yield


app = FastAPI(
    title="DelveMoar API",
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
app.include_router(monsters.router, prefix=V1_PREFIX)
app.include_router(spells.router, prefix=V1_PREFIX)

"""FastAPI application factory and lifespan configuration."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.exceptions import register_exception_handlers
from app.openapi import downgrade_to_openapi_30
from app.routers import health, items, monsters, spells

V1_PREFIX = "/v1"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown.

    Initializes the database engine on startup. Teardown logic for a
    graceful connection pool shutdown will be added here as needed.

    Args:
        app: The FastAPI application instance.

    Yields:
        Control back to FastAPI after startup tasks complete.
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


@app.middleware("http")
async def _add_x_robots_tag(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


# Register CORS middleware before any routers or exception handlers, so CORS
# headers are included in all responses.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# /health is intentionally outside /v1 -- it is infrastructure, not a resource.
app.include_router(health.router)

# Resource routers are mounted under /v1.
app.include_router(items.router, prefix=V1_PREFIX)
app.include_router(monsters.router, prefix=V1_PREFIX)
app.include_router(spells.router, prefix=V1_PREFIX)


# FastAPI + Pydantic v2 emit OpenAPI 3.1 by default, but oapi-codegen does
# not yet support 3.1.  Override app.openapi() to downgrade the schema to
# 3.0.3 at serve time so both the Go and TypeScript generators stay happy.
# Remove once https://github.com/oapi-codegen/oapi-codegen/issues/373 lands.
_base_openapi = app.openapi


def _openapi_30() -> dict[str, Any]:
    """Return the OpenAPI schema downgraded to 3.0.3."""
    return downgrade_to_openapi_30(_base_openapi())


app.openapi = _openapi_30  # type: ignore[method-assign]

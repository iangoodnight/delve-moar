"""FastAPI application factory and lifespan configuration."""

import logging
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.exceptions import register_exception_handlers
from app.observability import init_observability
from app.openapi import downgrade_to_openapi_30
from app.routers import auth, health, items, monsters, spells

V1_PREFIX = "/v1"

# Initialize error tracking before the app is created so the SDK's
# FastAPI/Starlette integrations instrument the request path. No-op until
# SENTRY_DSN is set.
init_observability()


def _configure_app_logging() -> None:
    """Make the application's own loggers visible in the server output.

    uvicorn configures its ``uvicorn*`` loggers but neither the root nor the
    ``app`` logger, so ``logging.getLogger("app.*").info(...)`` records are
    dropped by the level-WARNING last-resort handler. Bind the ``app`` logger
    to uvicorn's handlers (falling back to a plain stream handler off
    uvicorn) at INFO, so app logs -- such as the console mailer transport --
    actually appear. Idempotent: a second call is a no-op.
    """
    app_logger = logging.getLogger("app")
    app_logger.setLevel(logging.INFO)
    if app_logger.handlers:
        return
    uvicorn_handlers = logging.getLogger("uvicorn").handlers
    app_logger.handlers = uvicorn_handlers or [logging.StreamHandler()]
    app_logger.propagate = False


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown.

    Configures application logging and initializes the database engine on
    startup. Teardown logic for a graceful connection pool shutdown will be
    added here as needed.

    Args:
        app: The FastAPI application instance.

    Yields:
        Control back to FastAPI after startup tasks complete.
    """
    _configure_app_logging()
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
async def _add_x_robots_tag(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    response = await call_next(request)
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


# Register CORS middleware before any routers or exception handlers, so CORS
# headers are included in all responses.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# /health is intentionally outside /v1 -- it is infrastructure, not a resource.
app.include_router(health.router)

# Resource routers are mounted under /v1.
app.include_router(auth.router, prefix=V1_PREFIX)
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

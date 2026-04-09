from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # DB engine init and teardown will be wired here in a future issue
    # once endpoints that need a live connection are introduced.
    yield


app = FastAPI(
    title="Delve Moar API",
    version=settings.version,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.include_router(health.router)

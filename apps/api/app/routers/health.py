"""Health check router."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Response schema for the health check endpoint."""

    status: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return API status and current version."""
    return HealthResponse(status="ok", version=settings.version)

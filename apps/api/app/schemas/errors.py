"""Error response schema for all API error responses."""

from app.schemas.base import AppSchema


class ErrorResponse(AppSchema):
    """Standard error response schema."""

    status: int  # http status code
    developer_message: str
    user_message: str
    error_code: str  # machine-readable error code
    more_info: str

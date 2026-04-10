"""Custom exception classes and handlers for the application."""

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas.errors import ErrorResponse


class AppError(Exception):
    """Base class for all application-level HTTP errors.

    Attributes:
        status: HTTP status code to return.
        developer_message: Detailed message for developers.
        user_message: User-friendly message for end users.
        error_code: Machine-readable error code (SCREAMING_SNAKE_CASE).
        more_info: Absolute URL pointing to relevant API documentation.

    Usage:
        raise AppError(
            status=400,
            developer_message="Invalid input: 'name' field is missing.",
            user_message="Please provide a name.",
            error_code="MISSING_FIELD",
            more_info=f"{settings.public_url}/docs",
        )
    """

    def __init__(
        self,
        *,
        status: int,
        developer_message: str,
        user_message: str,
        error_code: str,
        more_info: str,
    ) -> None:
        """Initialize AppError with all required fields."""
        self.status = status
        self.developer_message = developer_message
        self.user_message = user_message
        self.error_code = error_code
        self.more_info = more_info
        super().__init__(developer_message)


async def _handle_app_error(request: Request, exc: Any) -> JSONResponse:
    """Convert AppError exceptions into standardized JSON responses.

    Args:
        request: The incoming HTTP request that triggered the error.
        exc: The exception instance -- must be an AppError.

    Returns:
        JSONResponse with the ErrorResponse schema and the AppError's status.

    Raises:
        TypeError: If exc is not an AppError instance.
    """
    if not isinstance(exc, AppError):
        raise TypeError(f"Expected AppError, got {type(exc).__name__}")
    return JSONResponse(
        status_code=exc.status,
        content=ErrorResponse(
            status=exc.status,
            developer_message=exc.developer_message,
            user_message=exc.user_message,
            error_code=exc.error_code,
            more_info=exc.more_info,
        ).model_dump(by_alias=True),
    )


async def _handle_validation_error(request: Request, exc: Any) -> JSONResponse:
    """Convert RequestValidationError into a standardized JSON response.

    FastAPI raises RequestValidationError for invalid query params or request
    bodies. This handler normalizes it to the same ErrorResponse shape used
    everywhere else in the API.

    Args:
        request: The incoming HTTP request that triggered the error.
        exc: The exception instance -- must be a RequestValidationError.

    Returns:
        JSONResponse with status 422 and an ErrorResponse body.

    Raises:
        TypeError: If exc is not a RequestValidationError instance.
    """
    if not isinstance(exc, RequestValidationError):
        raise TypeError(
            f"Expected RequestValidationError, got {type(exc).__name__}"
        )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=ErrorResponse(
            status=status.HTTP_422_UNPROCESSABLE_CONTENT,
            developer_message=str(exc.errors()),
            user_message="Invalid input data. Please check your request.",
            error_code="VALIDATION_ERROR",
            more_info=f"{settings.public_url}/docs",
        ).model_dump(by_alias=True),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers with the FastAPI application.

    Args:
        app: The FastAPI application instance.
    """
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)


def get_or_404[T](
    result: T | None,
    *,
    resource: str,
    identifier: str | int,
) -> T:
    """Return result or raise a 404 AppError if it is None.

    Args:
        result: The value to return if present.
        resource: Human-readable resource type, e.g. ``"monster"``.
        identifier: The slug or ID used to look up the resource.

    Returns:
        The unwrapped result.

    Raises:
        AppError: With status 404 if result is None.
    """
    if result is None:
        raise AppError(
            status=status.HTTP_404_NOT_FOUND,
            developer_message=(
                f"{resource} with identifier '{identifier}' not found."
            ),
            user_message=f"{resource.capitalize()} not found.",
            error_code="RESOURCE_NOT_FOUND",
            more_info=f"{settings.public_url}/docs",
        )
    return result

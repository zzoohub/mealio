"""Global exception classes."""

from typing import Any

from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Base exception for API errors."""

    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str = "Internal server error",
        headers: dict[str, str] | None = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class NotFoundError(BaseAPIException):
    """Resource not found exception."""

    def __init__(self, resource: str = "Resource", resource_id: Any = None):
        detail = f"{resource} not found"
        if resource_id:
            detail = f"{resource} with id {resource_id} not found"
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class BadRequestError(BaseAPIException):
    """Bad request exception."""

    def __init__(self, detail: str = "Bad request"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class UnauthorizedError(BaseAPIException):
    """Unauthorized access exception."""

    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenError(BaseAPIException):
    """Forbidden access exception."""

    def __init__(self, detail: str = "Forbidden"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ConflictError(BaseAPIException):
    """Resource conflict exception."""

    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class ValidationError(BaseAPIException):
    """Validation error exception."""

    def __init__(self, detail: str = "Validation error", errors: list[dict] | None = None):
        if errors:
            super().__init__(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": detail, "errors": errors},
            )
        else:
            super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class RateLimitError(BaseAPIException):
    """Rate limit exceeded exception."""

    def __init__(self, detail: str = "Rate limit exceeded", retry_after: int | None = None):
        headers = {}
        if retry_after:
            headers["Retry-After"] = str(retry_after)
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers=headers,
        )


class ServiceUnavailableError(BaseAPIException):
    """Service unavailable exception."""

    def __init__(self, detail: str = "Service temporarily unavailable"):
        super().__init__(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
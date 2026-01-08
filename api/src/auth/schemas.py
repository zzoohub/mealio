"""Authentication schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class PhoneLoginRequest(BaseModel):
    """Phone login request schema."""

    phone: str = Field(
        ...,
        min_length=10,
        max_length=20,
        pattern=r"^\+?[1-9]\d{1,14}$",
        description="Phone number in E.164 format",
    )


class PhoneVerifyRequest(BaseModel):
    """Phone verification request schema."""

    phone: str = Field(
        ...,
        min_length=10,
        max_length=20,
        pattern=r"^\+?[1-9]\d{1,14}$",
        description="Phone number in E.164 format",
    )
    code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-digit verification code",
    )


class UserCreateRequest(BaseModel):
    """User registration request schema."""

    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    phone: str = Field(
        ...,
        min_length=10,
        max_length=20,
        pattern=r"^\+?[1-9]\d{1,14}$",
        description="Phone number in E.164 format",
    )
    email: EmailStr | None = Field(default=None)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username."""
        v = v.strip().lower()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters long")
        if len(v) > 50:
            raise ValueError("Username must be at most 50 characters long")
        return v


class TokenResponse(BaseModel):
    """JWT token response schema."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user_id: UUID


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""

    refresh_token: str


class UserResponse(BaseModel):
    """User response schema."""

    id: UUID
    username: str
    phone: str
    email: EmailStr | None
    avatar_url: str | None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None


class SessionInfo(BaseModel):
    """Session information schema."""

    id: UUID
    device_info: dict[str, Any] | None
    ip_address: str | None
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime


class VerificationStatusResponse(BaseModel):
    """Verification status response."""

    phone: str
    is_sent: bool
    expires_in: int | None  # seconds
    attempts_remaining: int | None
    message: str
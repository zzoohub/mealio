"""Authentication domain models."""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pydantic import EmailStr
from sqlmodel import Field, Relationship

from src.models import BaseModel, SoftDeleteMixin


class User(BaseModel, SoftDeleteMixin, table=True):
    """User model."""

    __tablename__ = "users"

    username: str = Field(max_length=50, unique=True, index=True)
    phone: str = Field(max_length=20, unique=True, index=True)
    email: EmailStr | None = Field(
        default=None,
        max_length=255,
        unique=True,
        index=True
    )
    avatar_url: str | None = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    last_login_at: datetime | None = Field(default=None)

    # Relationships
    sessions: list["UserSession"] = Relationship(
        back_populates="user",
        cascade_delete=True
    )
    phone_verifications: list["PhoneVerification"] = Relationship(
        cascade_delete=True,
        sa_relationship_kwargs={"lazy": "dynamic"}
    )


class PhoneVerification(BaseModel, table=True):
    """Phone verification model."""

    __tablename__ = "phone_verifications"

    phone: str = Field(max_length=20, index=True)
    verification_code: str = Field(max_length=6)
    attempts: int = Field(default=0, ge=0)
    is_verified: bool = Field(default=False)
    expires_at: datetime = Field()
    verified_at: datetime | None = Field(default=None)


class UserSession(BaseModel, table=True):
    """User session model."""

    __tablename__ = "user_sessions"

    user_id: UUID = Field(foreign_key="users.id", index=True)
    token_hash: str = Field(max_length=64, unique=True, index=True)
    device_info: dict[str, Any] | None = Field(default=None)
    ip_address: str | None = Field(default=None, max_length=45)
    expires_at: datetime = Field()
    last_used_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    user: User = Relationship(back_populates="sessions")
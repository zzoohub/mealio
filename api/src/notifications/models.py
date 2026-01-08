"""Notifications domain models."""

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID

from sqlalchemy import Index
from sqlmodel import Field, Relationship, SQLModel

from src.auth.models import User
from src.models import BaseModel, TimestampMixin, UUIDMixin


class PushToken(TimestampMixin, SQLModel, table=True):
    """Push notification token model."""

    __tablename__ = "push_tokens"
    __table_args__ = (
        Index("idx_push_tokens_user_platform", "user_id", "platform"),
        Index("idx_push_tokens_token", "token", unique=True),
    )

    user_id: UUID = Field(foreign_key="users.id", primary_key=True, index=True)
    platform: Literal["ios", "android", "web"] = Field(
        max_length=20, primary_key=True
    )
    token: str = Field(max_length=500, unique=True)
    device_id: str | None = Field(default=None, max_length=100, index=True)
    app_version: str | None = Field(default=None, max_length=20)
    is_active: bool = Field(default=True)
    last_used_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    user: User = Relationship()


class Notification(BaseModel, table=True):
    """Notification model."""

    __tablename__ = "notifications"
    __table_args__ = (
        Index("idx_notifications_user_type", "user_id", "notification_type"),
        Index("idx_notifications_created_at", "created_at"),
        Index("idx_notifications_scheduled_for", "scheduled_for"),
    )

    user_id: UUID = Field(foreign_key="users.id", index=True)
    notification_type: Literal[
        "meal_reminder",
        "goal_achievement",
        "social_like",
        "social_comment",
        "social_follow",
        "streak_milestone",
        "weekly_summary",
        "ai_insight",
        "system_announcement",
    ] = Field(max_length=50, index=True)
    
    title: str = Field(max_length=255)
    body: str = Field(max_length=500)
    data: dict[str, Any] | None = Field(default=None)
    
    # Delivery scheduling
    scheduled_for: datetime | None = Field(default=None, index=True)
    is_delivered: bool = Field(default=False, index=True)
    delivered_at: datetime | None = Field(default=None)
    
    # User interaction
    is_read: bool = Field(default=False, index=True)
    read_at: datetime | None = Field(default=None)
    is_clicked: bool = Field(default=False)
    clicked_at: datetime | None = Field(default=None)
    
    # Delivery metadata
    push_response: dict[str, Any] | None = Field(default=None)
    delivery_attempts: int = Field(default=0)
    last_delivery_attempt: datetime | None = Field(default=None)

    # Relationships
    user: User = Relationship()


class NotificationTemplate(UUIDMixin, TimestampMixin, SQLModel, table=True):
    """Notification template model."""

    __tablename__ = "notification_templates"

    template_key: str = Field(max_length=100, unique=True, index=True)
    notification_type: Literal[
        "meal_reminder",
        "goal_achievement",
        "social_like",
        "social_comment",
        "social_follow",
        "streak_milestone",
        "weekly_summary",
        "ai_insight",
        "system_announcement",
    ] = Field(max_length=50)
    
    title_template: str = Field(max_length=255)
    body_template: str = Field(max_length=500)
    
    # Template variables and their types
    variables: dict[str, Any] | None = Field(default=None)
    
    # Delivery settings
    is_active: bool = Field(default=True)
    priority: Literal["low", "normal", "high"] = Field(
        default="normal",
        max_length=10
    )
    
    # Localization support
    language: Literal["en", "ko"] = Field(
        default="en",
        max_length=5
    )


class NotificationQueue(UUIDMixin, TimestampMixin, SQLModel, table=True):
    """Notification queue for batch processing."""

    __tablename__ = "notification_queue"
    __table_args__ = (
        Index("idx_notification_queue_status", "status"),
        Index("idx_notification_queue_scheduled", "scheduled_for"),
    )

    notification_id: UUID = Field(foreign_key="notifications.id", index=True)
    status: Literal["pending", "processing", "sent", "failed", "cancelled"] = Field(
        default="pending",
        max_length=20, index=True
    )
    scheduled_for: datetime = Field(nullable=False, index=True)
    processed_at: datetime | None = Field(default=None)
    error_message: str | None = Field(default=None)
    retry_count: int = Field(default=0, ge=0)
    max_retries: int = Field(default=3, ge=0)

    # Relationships
    notification: Notification = Relationship()
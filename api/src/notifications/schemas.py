"""Notifications domain schemas."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class PushTokenRegisterRequest(BaseModel):
    """Register push token request schema."""
    
    platform: Literal["ios", "android", "web"]
    token: str = Field(..., min_length=1, max_length=500)
    device_id: str | None = Field(default=None, max_length=100)
    app_version: str | None = Field(default=None, max_length=20)


class PushTokenResponse(BaseModel):
    """Push token response schema."""
    
    user_id: UUID
    platform: Literal["ios", "android", "web"]
    token: str
    device_id: str | None
    app_version: str | None
    is_active: bool
    last_used_at: datetime
    created_at: datetime
    updated_at: datetime


class NotificationCreateRequest(BaseModel):
    """Create notification request schema."""
    
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
    ]
    title: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1, max_length=500)
    data: dict[str, Any] | None = Field(default=None)
    scheduled_for: datetime | None = Field(default=None)


class NotificationResponse(BaseModel):
    """Notification response schema."""
    
    id: UUID
    user_id: UUID
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
    ]
    title: str
    body: str
    data: dict[str, Any] | None
    scheduled_for: datetime | None
    is_delivered: bool
    delivered_at: datetime | None
    is_read: bool
    read_at: datetime | None
    is_clicked: bool
    clicked_at: datetime | None
    created_at: datetime


class NotificationUpdateRequest(BaseModel):
    """Update notification request schema."""
    
    is_read: bool | None = Field(default=None)
    is_clicked: bool | None = Field(default=None)


class NotificationBulkUpdateRequest(BaseModel):
    """Bulk update notifications request schema."""
    
    notification_ids: list[UUID] = Field(..., max_items=100)
    is_read: bool | None = Field(default=None)


class NotificationStatsResponse(BaseModel):
    """Notification statistics response schema."""
    
    total_notifications: int
    unread_count: int
    delivered_count: int
    clicked_count: int
    
    # By type
    type_breakdown: dict[str, int]
    
    # Recent activity
    recent_notifications_count: int  # Last 7 days
    avg_daily_notifications: float


class NotificationListResponse(BaseModel):
    """Notification list response schema."""
    
    notifications: list[NotificationResponse]
    total_count: int
    unread_count: int
    has_more: bool


class SendNotificationRequest(BaseModel):
    """Send immediate notification request schema."""
    
    user_ids: list[UUID] = Field(..., max_items=1000)
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
    ]
    title: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1, max_length=500)
    data: dict[str, Any] | None = Field(default=None)


class NotificationDeliveryResponse(BaseModel):
    """Notification delivery response schema."""
    
    total_recipients: int
    successful_deliveries: int
    failed_deliveries: int
    notification_ids: list[UUID]


class NotificationTemplateResponse(BaseModel):
    """Notification template response schema."""
    
    id: UUID
    template_key: str
    notification_type: str
    title_template: str
    body_template: str
    variables: dict[str, Any] | None
    is_active: bool
    priority: Literal["low", "normal", "high"]
    language: Literal["en", "ko"]


class RenderTemplateRequest(BaseModel):
    """Render notification template request schema."""
    
    template_key: str
    variables: dict[str, Any] = Field(default_factory=dict)
    language: Literal["en", "ko"] = Field(default="en")
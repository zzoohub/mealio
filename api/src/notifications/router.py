"""Notifications domain router."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from src.auth.dependencies import DbSession, VerifiedUser
from src.notifications.schemas import (
    NotificationBulkUpdateRequest,
    NotificationCreateRequest,
    NotificationListResponse,
    NotificationResponse,
    NotificationStatsResponse,
    NotificationUpdateRequest,
    PushTokenRegisterRequest,
    PushTokenResponse,
    RenderTemplateRequest,
    SendNotificationRequest,
)
from src.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])
notification_service = NotificationService()


# Push token management
@router.post(
    "/push-tokens",
    response_model=PushTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register push notification token",
)
async def register_push_token(
    token_data: PushTokenRegisterRequest,
    user: VerifiedUser,
    session: DbSession,
) -> PushTokenResponse:
    """Register or update push notification token for the current user."""
    return await notification_service.register_push_token(session, user.id, token_data)


@router.delete(
    "/push-tokens/{platform}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate push token",
)
async def deactivate_push_token(
    platform: str,
    user: VerifiedUser,
    session: DbSession,
) -> None:
    """Deactivate push notification token for a specific platform."""
    await notification_service.deactivate_push_token(session, user.id, platform)


# Notification CRUD
@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Get user notifications",
)
async def get_my_notifications(
    user: VerifiedUser,
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    unread_only: bool = False,
) -> NotificationListResponse:
    """Get notifications for the current user."""
    return await notification_service.get_user_notifications(
        session, user.id, limit, offset, unread_only
    )


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create notification",
)
async def create_notification(
    notification_data: NotificationCreateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> NotificationResponse:
    """Create a notification for the current user."""
    return await notification_service.create_notification(
        session, user.id, notification_data
    )


@router.put(
    "/{notification_id}",
    response_model=NotificationResponse,
    summary="Update notification",
)
async def update_notification(
    notification_id: UUID,
    update_data: NotificationUpdateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> NotificationResponse:
    """Update a notification (mark as read/clicked)."""
    return await notification_service.update_notification(
        session, user.id, notification_id, update_data
    )


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete notification",
)
async def delete_notification(
    notification_id: UUID,
    user: VerifiedUser,
    session: DbSession,
) -> None:
    """Delete a specific notification."""
    await notification_service.delete_notification(session, user.id, notification_id)


# Bulk operations
@router.put(
    "/bulk/mark-read",
    summary="Mark notifications as read",
)
async def bulk_mark_as_read(
    user: VerifiedUser,
    session: DbSession,
    bulk_data: NotificationBulkUpdateRequest | None = None,
) -> dict[str, int]:
    """Mark multiple notifications as read."""
    notification_ids = bulk_data.notification_ids if bulk_data else None
    updated_count = await notification_service.bulk_mark_as_read(
        session, user.id, notification_ids
    )
    return {"updated_count": updated_count}


# Statistics
@router.get(
    "/stats",
    response_model=NotificationStatsResponse,
    summary="Get notification statistics",
)
async def get_notification_stats(
    user: VerifiedUser,
    session: DbSession,
) -> NotificationStatsResponse:
    """Get notification statistics for the current user."""
    return await notification_service.get_notification_stats(session, user.id)


# Template rendering (for preview/testing)
@router.post(
    "/templates/render",
    summary="Render notification template",
)
async def render_template(
    render_request: RenderTemplateRequest,
    session: DbSession,
) -> dict[str, str]:
    """Render a notification template with provided variables."""
    return await notification_service.render_template(session, render_request)


# Admin endpoints (would typically require admin authorization)
@router.post(
    "/send-bulk",
    summary="Send notification to multiple users",
    # dependencies=[Depends(require_admin)],  # Add admin auth when available
)
async def send_bulk_notification(
    notification_request: SendNotificationRequest,
    session: DbSession,
) -> dict:
    """Send notification to multiple users (admin only)."""
    result = await notification_service.send_notification_to_users(
        session, notification_request
    )
    return result.model_dump()


# Background processing endpoint (for monitoring)
@router.post(
    "/process-queue",
    summary="Process notification delivery queue",
    # dependencies=[Depends(require_admin)],  # Add admin auth when available
)
async def process_notification_queue(
    session: DbSession,
    batch_size: Annotated[int, Query(ge=1, le=1000)] = 100,
) -> dict[str, int]:
    """Process queued notifications for delivery (admin only)."""
    return await notification_service.deliver_queued_notifications(
        session, batch_size
    )
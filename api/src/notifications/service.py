"""Notifications domain service."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, desc, func, or_, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.exceptions import BadRequestError, NotFoundError
from src.notifications.models import (
    Notification,
    NotificationQueue,
    NotificationTemplate,
    PushToken,
)
from src.notifications.schemas import (
    NotificationCreateRequest,
    NotificationDeliveryResponse,
    NotificationListResponse,
    NotificationResponse,
    NotificationStatsResponse,
    NotificationUpdateRequest,
    PushTokenRegisterRequest,
    PushTokenResponse,
    RenderTemplateRequest,
    SendNotificationRequest,
)

logger = logging.getLogger(__name__)


class NotificationService:
    """Notifications domain business logic."""

    async def register_push_token(
        self,
        session: AsyncSession,
        user_id: UUID,
        token_data: PushTokenRegisterRequest,
    ) -> PushTokenResponse:
        """Register or update push notification token."""
        # Check if token already exists for this user/platform
        result = await session.exec(
            select(PushToken).where(
                and_(
                    PushToken.user_id == user_id,
                    PushToken.platform == token_data.platform,
                )
            )
        )
        existing_token = result.first()
        
        if existing_token:
            # Update existing token
            existing_token.token = token_data.token
            existing_token.device_id = token_data.device_id
            existing_token.app_version = token_data.app_version
            existing_token.is_active = True
            existing_token.last_used_at = datetime.now(timezone.utc)
            token = existing_token
        else:
            # Create new token
            token = PushToken(
                user_id=user_id,
                platform=token_data.platform,
                token=token_data.token,
                device_id=token_data.device_id,
                app_version=token_data.app_version,
            )
            session.add(token)
        
        await session.commit()
        await session.refresh(token)
        
        return PushTokenResponse(
            user_id=token.user_id,
            platform=token.platform,
            token=token.token,
            device_id=token.device_id,
            app_version=token.app_version,
            is_active=token.is_active,
            last_used_at=token.last_used_at,
            created_at=token.created_at,
            updated_at=token.updated_at,
        )

    async def deactivate_push_token(
        self,
        session: AsyncSession,
        user_id: UUID,
        platform: str,
    ) -> None:
        """Deactivate push token for a user and platform."""
        await session.exec(
            update(PushToken)
            .where(
                and_(
                    PushToken.user_id == user_id,
                    PushToken.platform == platform,
                )
            )
            .values(is_active=False)
        )
        await session.commit()

    async def create_notification(
        self,
        session: AsyncSession,
        user_id: UUID,
        notification_data: NotificationCreateRequest,
    ) -> NotificationResponse:
        """Create a new notification."""
        notification = Notification(
            user_id=user_id,
            notification_type=notification_data.notification_type,
            title=notification_data.title,
            body=notification_data.body,
            data=notification_data.data,
            scheduled_for=notification_data.scheduled_for,
        )
        
        session.add(notification)
        await session.commit()
        await session.refresh(notification)
        
        # If immediate notification, queue for delivery
        if notification_data.scheduled_for is None:
            await self._queue_notification(session, notification.id)
        
        return self._notification_to_response(notification)

    async def send_notification_to_users(
        self,
        session: AsyncSession,
        notification_request: SendNotificationRequest,
    ) -> NotificationDeliveryResponse:
        """Send notification to multiple users."""
        if len(notification_request.user_ids) > 1000:
            raise BadRequestError("Maximum 1000 users allowed per batch")
        
        notification_ids = []
        successful_deliveries = 0
        failed_deliveries = 0
        
        for user_id in notification_request.user_ids:
            try:
                notification = Notification(
                    user_id=user_id,
                    notification_type=notification_request.notification_type,
                    title=notification_request.title,
                    body=notification_request.body,
                    data=notification_request.data,
                )
                
                session.add(notification)
                await session.flush()  # Get ID without committing
                notification_ids.append(notification.id)
                
                # Queue for immediate delivery
                await self._queue_notification(session, notification.id, commit=False)
                successful_deliveries += 1
                
            except Exception as e:
                logger.error(f"Failed to create notification for user {user_id}: {e}")
                failed_deliveries += 1
        
        await session.commit()
        
        return NotificationDeliveryResponse(
            total_recipients=len(notification_request.user_ids),
            successful_deliveries=successful_deliveries,
            failed_deliveries=failed_deliveries,
            notification_ids=notification_ids,
        )

    async def get_user_notifications(
        self,
        session: AsyncSession,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False,
    ) -> NotificationListResponse:
        """Get notifications for a user."""
        # Build query
        query = select(Notification).where(Notification.user_id == user_id)
        
        if unread_only:
            query = query.where(Notification.is_read == False)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await session.exec(count_query)
        total_count = count_result.scalar() or 0
        
        # Get unread count
        unread_query = select(func.count()).where(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        )
        unread_result = await session.exec(unread_query)
        unread_count = unread_result.scalar() or 0
        
        # Get notifications with pagination
        query = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit)
        result = await session.exec(query)
        notifications = result.scalars().all()
        
        notification_responses = [
            self._notification_to_response(notification)
            for notification in notifications
        ]
        
        return NotificationListResponse(
            notifications=notification_responses,
            total_count=total_count,
            unread_count=unread_count,
            has_more=offset + limit < total_count,
        )

    async def update_notification(
        self,
        session: AsyncSession,
        user_id: UUID,
        notification_id: UUID,
        update_data: NotificationUpdateRequest,
    ) -> NotificationResponse:
        """Update notification (mark as read/clicked)."""
        result = await session.exec(
            select(Notification).where(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user_id,
                )
            )
        )
        notification = result.first()
        
        if not notification:
            raise NotFoundError("Notification not found")
        
        now = datetime.now(timezone.utc)
        
        if update_data.is_read is not None:
            notification.is_read = update_data.is_read
            if update_data.is_read and not notification.read_at:
                notification.read_at = now
        
        if update_data.is_clicked is not None:
            notification.is_clicked = update_data.is_clicked
            if update_data.is_clicked and not notification.clicked_at:
                notification.clicked_at = now
        
        await session.commit()
        await session.refresh(notification)
        
        return self._notification_to_response(notification)

    async def bulk_mark_as_read(
        self,
        session: AsyncSession,
        user_id: UUID,
        notification_ids: list[UUID] | None = None,
    ) -> int:
        """Mark notifications as read in bulk."""
        query = update(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        )
        
        if notification_ids:
            query = query.where(Notification.id.in_(notification_ids))
        
        query = query.values(
            is_read=True,
            read_at=datetime.now(timezone.utc),
        )
        
        result = await session.exec(query)
        await session.commit()
        
        return result.rowcount

    async def delete_notification(
        self,
        session: AsyncSession,
        user_id: UUID,
        notification_id: UUID,
    ) -> None:
        """Delete a notification."""
        result = await session.exec(
            select(Notification).where(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user_id,
                )
            )
        )
        notification = result.first()
        
        if not notification:
            raise NotFoundError("Notification not found")
        
        await session.delete(notification)
        await session.commit()

    async def get_notification_stats(
        self,
        session: AsyncSession,
        user_id: UUID,
    ) -> NotificationStatsResponse:
        """Get notification statistics for a user."""
        query = text("""
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(*) FILTER (WHERE is_read = false) as unread_count,
                COUNT(*) FILTER (WHERE is_delivered = true) as delivered_count,
                COUNT(*) FILTER (WHERE is_clicked = true) as clicked_count,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_notifications_count,
                notification_type,
                COUNT(*) as type_count
            FROM notifications
            WHERE user_id = :user_id
            GROUP BY ROLLUP(notification_type)
            ORDER BY notification_type NULLS LAST
        """)
        
        result = await session.exec(query, {"user_id": str(user_id)})
        rows = result.mappings().all()
        
        if not rows:
            return NotificationStatsResponse(
                total_notifications=0,
                unread_count=0,
                delivered_count=0,
                clicked_count=0,
                type_breakdown={},
                recent_notifications_count=0,
                avg_daily_notifications=0.0,
            )
        
        # The first row (with notification_type = NULL) contains aggregated stats
        total_row = next((row for row in rows if row["notification_type"] is None), None)
        type_rows = [row for row in rows if row["notification_type"] is not None]
        
        if not total_row:
            return NotificationStatsResponse(
                total_notifications=0,
                unread_count=0,
                delivered_count=0,
                clicked_count=0,
                type_breakdown={},
                recent_notifications_count=0,
                avg_daily_notifications=0.0,
            )
        
        type_breakdown = {
            row["notification_type"]: row["type_count"]
            for row in type_rows
        }
        
        return NotificationStatsResponse(
            total_notifications=total_row["total_notifications"],
            unread_count=total_row["unread_count"],
            delivered_count=total_row["delivered_count"],
            clicked_count=total_row["clicked_count"],
            type_breakdown=type_breakdown,
            recent_notifications_count=total_row["recent_notifications_count"],
            avg_daily_notifications=total_row["recent_notifications_count"] / 7.0,
        )

    async def render_template(
        self,
        session: AsyncSession,
        render_request: RenderTemplateRequest,
    ) -> dict[str, str]:
        """Render notification template with variables."""
        result = await session.exec(
            select(NotificationTemplate).where(
                and_(
                    NotificationTemplate.template_key == render_request.template_key,
                    NotificationTemplate.language == render_request.language,
                    NotificationTemplate.is_active == True,
                )
            )
        )
        template = result.first()
        
        if not template:
            raise NotFoundError(f"Template '{render_request.template_key}' not found")
        
        # Simple template rendering (in production, use proper template engine)
        title = template.title_template
        body = template.body_template
        
        for key, value in render_request.variables.items():
            placeholder = f"{{{key}}}"
            title = title.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))
        
        return {
            "title": title,
            "body": body,
        }

    async def _queue_notification(
        self,
        session: AsyncSession,
        notification_id: UUID,
        commit: bool = True,
    ) -> None:
        """Queue notification for delivery."""
        queue_item = NotificationQueue(
            notification_id=notification_id,
            scheduled_for=datetime.now(timezone.utc),
        )
        
        session.add(queue_item)
        
        if commit:
            await session.commit()

    def _notification_to_response(self, notification: Notification) -> NotificationResponse:
        """Convert notification model to response schema."""
        return NotificationResponse(
            id=notification.id,
            user_id=notification.user_id,
            notification_type=notification.notification_type,
            title=notification.title,
            body=notification.body,
            data=notification.data,
            scheduled_for=notification.scheduled_for,
            is_delivered=notification.is_delivered,
            delivered_at=notification.delivered_at,
            is_read=notification.is_read,
            read_at=notification.read_at,
            is_clicked=notification.is_clicked,
            clicked_at=notification.clicked_at,
            created_at=notification.created_at,
        )

    async def deliver_queued_notifications(
        self,
        session: AsyncSession,
        batch_size: int = 100,
    ) -> dict[str, int]:
        """Process queued notifications for delivery (background task)."""
        # This method would be called by a background worker
        # For now, it's a placeholder that simulates delivery
        
        # Get pending notifications
        result = await session.exec(
            select(NotificationQueue)
            .where(
                and_(
                    NotificationQueue.status == "pending",
                    NotificationQueue.scheduled_for <= datetime.now(timezone.utc),
                )
            )
            .limit(batch_size)
        )
        queue_items = result.scalars().all()
        
        delivered = 0
        failed = 0
        
        for queue_item in queue_items:
            try:
                # Simulate push notification delivery
                # In production, integrate with FCM, APNS, etc.
                await asyncio.sleep(0.01)  # Simulate network delay
                
                # Mark as delivered
                queue_item.status = "sent"
                queue_item.processed_at = datetime.now(timezone.utc)
                
                # Update notification
                notification_result = await session.exec(
                    select(Notification).where(Notification.id == queue_item.notification_id)
                )
                notification = notification_result.first()
                
                if notification:
                    notification.is_delivered = True
                    notification.delivered_at = datetime.now(timezone.utc)
                
                delivered += 1
                
            except Exception as e:
                logger.error(f"Failed to deliver notification {queue_item.notification_id}: {e}")
                
                queue_item.retry_count += 1
                if queue_item.retry_count >= queue_item.max_retries:
                    queue_item.status = "failed"
                    queue_item.error_message = str(e)
                else:
                    queue_item.status = "pending"  # Will retry
                
                queue_item.processed_at = datetime.now(timezone.utc)
                failed += 1
        
        await session.commit()
        
        return {
            "processed": len(queue_items),
            "delivered": delivered,
            "failed": failed,
        }
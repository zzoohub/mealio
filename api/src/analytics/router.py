"""Analytics domain router."""

from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Query, status

from src.analytics.schemas import (
    AnalyticsEventCreateRequest,
    AnalyticsEventResponse,
    DailySummaryResponse,
    EventBatchRequest,
    UserProgressResponse,
    WeeklySummaryResponse,
)
from src.analytics.service import AnalyticsService
from src.auth.dependencies import DbSession, VerifiedUser

router = APIRouter(prefix="/analytics", tags=["Analytics"])
analytics_service = AnalyticsService()


@router.post(
    "/events",
    response_model=AnalyticsEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Track analytics event",
)
async def track_event(
    event_data: AnalyticsEventCreateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> AnalyticsEventResponse:
    """Track a single analytics event."""
    return await analytics_service.track_event(session, user.id, event_data)


@router.post(
    "/events/batch",
    response_model=list[AnalyticsEventResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Track multiple analytics events",
)
async def track_events_batch(
    batch_data: EventBatchRequest,
    user: VerifiedUser,
    session: DbSession,
) -> list[AnalyticsEventResponse]:
    """Track multiple analytics events in batch."""
    return await analytics_service.track_events_batch(session, user.id, batch_data.events)


@router.get(
    "/daily-summary",
    response_model=DailySummaryResponse | None,
    summary="Get daily summary",
)
async def get_daily_summary(
    user: VerifiedUser,
    session: DbSession,
    date_param: Annotated[date | None, Query(alias="date")] = None,
) -> DailySummaryResponse | None:
    """Get daily summary for a specific date (defaults to today)."""
    target_date = date_param or date.today()
    return await analytics_service.get_daily_summary(session, user.id, target_date)


@router.get(
    "/weekly-summary",
    response_model=WeeklySummaryResponse,
    summary="Get weekly summary",
)
async def get_weekly_summary(
    user: VerifiedUser,
    session: DbSession,
    week_start: Annotated[date | None, Query()] = None,
) -> WeeklySummaryResponse:
    """Get weekly summary starting from a specific date (defaults to current week)."""
    if not week_start:
        today = date.today()
        # Get Monday of current week
        week_start = today - timedelta(days=today.weekday())
    
    return await analytics_service.get_weekly_summary(session, user.id, week_start)


@router.get(
    "/progress",
    response_model=UserProgressResponse,
    summary="Get user progress",
)
async def get_user_progress(
    user: VerifiedUser,
    session: DbSession,
) -> UserProgressResponse:
    """Get current user's progress and achievements."""
    return await analytics_service.get_user_progress(session, user.id)


@router.get(
    "/insights",
    response_model=list,
    summary="Get personalized insights",
)
async def get_insights(
    user: VerifiedUser,
    session: DbSession,
) -> list:
    """Get personalized insights and recommendations."""
    return await analytics_service.generate_insights(session, user.id)


@router.put(
    "/daily-summary",
    response_model=DailySummaryResponse,
    summary="Update daily summary",
)
async def update_daily_summary(
    user: VerifiedUser,
    session: DbSession,
    date_param: Annotated[date | None, Query(alias="date")] = None,
    meals_logged: int | None = None,
    total_calories: int | None = None,
    total_protein_g: float | None = None,
    total_carbs_g: float | None = None,
    total_fat_g: float | None = None,
    total_fiber_g: float | None = None,
    water_glasses: int | None = None,
    app_sessions: int | None = None,
    total_app_time_minutes: int | None = None,
    photos_taken: int | None = None,
    posts_created: int | None = None,
    likes_given: int | None = None,
    comments_made: int | None = None,
) -> DailySummaryResponse:
    """Update daily summary with new metrics."""
    target_date = date_param or date.today()
    
    updates = {}
    if meals_logged is not None:
        updates["meals_logged"] = meals_logged
    if total_calories is not None:
        updates["total_calories"] = total_calories
    if total_protein_g is not None:
        updates["total_protein_g"] = total_protein_g
    if total_carbs_g is not None:
        updates["total_carbs_g"] = total_carbs_g
    if total_fat_g is not None:
        updates["total_fat_g"] = total_fat_g
    if total_fiber_g is not None:
        updates["total_fiber_g"] = total_fiber_g
    if water_glasses is not None:
        updates["water_glasses"] = water_glasses
    if app_sessions is not None:
        updates["app_sessions"] = app_sessions
    if total_app_time_minutes is not None:
        updates["total_app_time_minutes"] = total_app_time_minutes
    if photos_taken is not None:
        updates["photos_taken"] = photos_taken
    if posts_created is not None:
        updates["posts_created"] = posts_created
    if likes_given is not None:
        updates["likes_given"] = likes_given
    if comments_made is not None:
        updates["comments_made"] = comments_made
    
    return await analytics_service.update_daily_summary(
        session, user.id, target_date, **updates
    )
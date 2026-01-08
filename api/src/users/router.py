"""Users domain router."""

from fastapi import APIRouter, status

from src.auth.dependencies import DbSession, VerifiedUser
from src.users.schemas import (
    CameraSettingsResponse,
    CameraSettingsUpdateRequest,
    NotificationSettingsResponse,
    NotificationSettingsUpdateRequest,
    PrivacySettingsResponse,
    PrivacySettingsUpdateRequest,
    UserActivityStatsResponse,
    UserAllSettingsResponse,
    UserGoalsResponse,
    UserGoalsUpdateRequest,
    UserPreferencesResponse,
    UserPreferencesUpdateRequest,
)
from src.users.service import UserService

router = APIRouter(prefix="/users", tags=["Users"])
user_service = UserService()


@router.get(
    "/me/preferences",
    response_model=UserPreferencesResponse,
    summary="Get user preferences",
)
async def get_my_preferences(
    user: VerifiedUser,
    session: DbSession,
) -> UserPreferencesResponse:
    """Get current user's preferences."""
    return await user_service.get_user_preferences(session, user.id)


@router.put(
    "/me/preferences",
    response_model=UserPreferencesResponse,
    summary="Update user preferences",
)
async def update_my_preferences(
    update_data: UserPreferencesUpdateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> UserPreferencesResponse:
    """Update current user's preferences."""
    return await user_service.update_user_preferences(session, user.id, update_data)


@router.get(
    "/me/notifications",
    response_model=NotificationSettingsResponse,
    summary="Get notification settings",
)
async def get_my_notification_settings(
    user: VerifiedUser,
    session: DbSession,
) -> NotificationSettingsResponse:
    """Get current user's notification settings."""
    return await user_service.get_notification_settings(session, user.id)


@router.put(
    "/me/notifications",
    response_model=NotificationSettingsResponse,
    summary="Update notification settings",
)
async def update_my_notification_settings(
    update_data: NotificationSettingsUpdateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> NotificationSettingsResponse:
    """Update current user's notification settings."""
    return await user_service.update_notification_settings(session, user.id, update_data)


@router.get(
    "/me/privacy",
    response_model=PrivacySettingsResponse,
    summary="Get privacy settings",
)
async def get_my_privacy_settings(
    user: VerifiedUser,
    session: DbSession,
) -> PrivacySettingsResponse:
    """Get current user's privacy settings."""
    return await user_service.get_privacy_settings(session, user.id)


@router.put(
    "/me/privacy",
    response_model=PrivacySettingsResponse,
    summary="Update privacy settings",
)
async def update_my_privacy_settings(
    update_data: PrivacySettingsUpdateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> PrivacySettingsResponse:
    """Update current user's privacy settings."""
    return await user_service.update_privacy_settings(session, user.id, update_data)


@router.get(
    "/me/goals",
    response_model=UserGoalsResponse,
    summary="Get user goals",
)
async def get_my_goals(
    user: VerifiedUser,
    session: DbSession,
) -> UserGoalsResponse:
    """Get current user's goals."""
    return await user_service.get_user_goals(session, user.id)


@router.put(
    "/me/goals",
    response_model=UserGoalsResponse,
    summary="Update user goals",
)
async def update_my_goals(
    update_data: UserGoalsUpdateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> UserGoalsResponse:
    """Update current user's goals."""
    return await user_service.update_user_goals(session, user.id, update_data)


@router.get(
    "/me/camera",
    response_model=CameraSettingsResponse,
    summary="Get camera settings",
)
async def get_my_camera_settings(
    user: VerifiedUser,
    session: DbSession,
) -> CameraSettingsResponse:
    """Get current user's camera settings."""
    return await user_service.get_camera_settings(session, user.id)


@router.put(
    "/me/camera",
    response_model=CameraSettingsResponse,
    summary="Update camera settings",
)
async def update_my_camera_settings(
    update_data: CameraSettingsUpdateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> CameraSettingsResponse:
    """Update current user's camera settings."""
    return await user_service.update_camera_settings(session, user.id, update_data)


@router.get(
    "/me/settings",
    response_model=UserAllSettingsResponse,
    summary="Get all user settings",
)
async def get_my_all_settings(
    user: VerifiedUser,
    session: DbSession,
) -> UserAllSettingsResponse:
    """Get all current user's settings in one call."""
    return await user_service.get_all_settings(session, user.id)


@router.get(
    "/me/stats",
    response_model=UserActivityStatsResponse,
    summary="Get user activity statistics",
)
async def get_my_activity_stats(
    user: VerifiedUser,
    session: DbSession,
) -> UserActivityStatsResponse:
    """Get current user's activity statistics and achievements."""
    return await user_service.get_user_activity_stats(session, user.id)
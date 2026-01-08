"""Users domain service."""

from datetime import datetime, time, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.exceptions import BadRequestError, NotFoundError
from src.users.models import (
    CameraSettings,
    NotificationSettings,
    PrivacySettings,
    UserGoals,
    UserPreferences,
)
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


class UserService:
    """Users domain business logic."""

    async def get_user_preferences(
        self, session: AsyncSession, user_id: UUID
    ) -> UserPreferencesResponse:
        """Get or create user preferences using SQLModel native patterns."""
        result = await session.exec(
            select(UserPreferences).where(UserPreferences.user_id == user_id)
        )
        preferences = result.first()
        
        if not preferences:
            # Create default preferences
            preferences = UserPreferences(user_id=user_id)
            session.add(preferences)
            await session.commit()
            await session.refresh(preferences)
        
        return UserPreferencesResponse(
            language=preferences.language,
            theme=preferences.theme,
            measurement_units=preferences.measurement_units,
        )

    async def update_user_preferences(
        self,
        session: AsyncSession,
        user_id: UUID,
        update_data: UserPreferencesUpdateRequest,
    ) -> UserPreferencesResponse:
        """Update user preferences."""
        result = await session.exec(
            select(UserPreferences).where(UserPreferences.user_id == user_id)
        )
        preferences = result.first()
        
        if not preferences:
            preferences = UserPreferences(user_id=user_id)
            session.add(preferences)
        
        # Update fields
        if update_data.language is not None:
            preferences.language = update_data.language
        if update_data.theme is not None:
            preferences.theme = update_data.theme
        if update_data.measurement_units is not None:
            preferences.measurement_units = update_data.measurement_units
        
        await session.commit()
        await session.refresh(preferences)
        
        return UserPreferencesResponse(
            language=preferences.language,
            theme=preferences.theme,
            measurement_units=preferences.measurement_units,
        )

    async def get_notification_settings(
        self, session: AsyncSession, user_id: UUID
    ) -> NotificationSettingsResponse:
        """Get or create notification settings."""
        result = await session.exec(
            select(NotificationSettings).where(NotificationSettings.user_id == user_id)
        )
        settings = result.first()
        
        if not settings:
            # Create default settings
            settings = NotificationSettings(user_id=user_id)
            session.add(settings)
            await session.commit()
        
        return NotificationSettingsResponse(
            meal_reminders=settings.meal_reminders,
            social_notifications=settings.social_notifications,
            progress_updates=settings.progress_updates,
            ai_insights=settings.ai_insights,
            quiet_hours_enabled=settings.quiet_hours_enabled,
            quiet_hours_start=settings.quiet_hours_start,
            quiet_hours_end=settings.quiet_hours_end,
            frequency=settings.frequency,
            push_enabled=settings.push_enabled,
            email_enabled=settings.email_enabled,
        )

    async def update_notification_settings(
        self,
        session: AsyncSession,
        user_id: UUID,
        update_data: NotificationSettingsUpdateRequest,
    ) -> NotificationSettingsResponse:
        """Update notification settings."""
        result = await session.exec(
            select(NotificationSettings).where(NotificationSettings.user_id == user_id)
        )
        settings = result.first()
        
        if not settings:
            settings = NotificationSettings(user_id=user_id)
            session.add(settings)
        
        # Update fields
        for field, value in update_data.model_dump(exclude_unset=True).items():
            if hasattr(settings, field) and value is not None:
                setattr(settings, field, value)
        
        await session.commit()
        await session.refresh(settings)
        
        return NotificationSettingsResponse(
            meal_reminders=settings.meal_reminders,
            social_notifications=settings.social_notifications,
            progress_updates=settings.progress_updates,
            ai_insights=settings.ai_insights,
            quiet_hours_enabled=settings.quiet_hours_enabled,
            quiet_hours_start=settings.quiet_hours_start,
            quiet_hours_end=settings.quiet_hours_end,
            frequency=settings.frequency,
            push_enabled=settings.push_enabled,
            email_enabled=settings.email_enabled,
        )

    async def get_privacy_settings(
        self, session: AsyncSession, user_id: UUID
    ) -> PrivacySettingsResponse:
        """Get or create privacy settings."""
        result = await session.exec(
            select(PrivacySettings).where(PrivacySettings.user_id == user_id)
        )
        settings = result.first()
        
        if not settings:
            # Create default settings
            settings = PrivacySettings(user_id=user_id)
            session.add(settings)
            await session.commit()
        
        return PrivacySettingsResponse(
            profile_visibility=settings.profile_visibility,
            location_sharing=settings.location_sharing,
            analytics_collection=settings.analytics_collection,
            crash_reporting=settings.crash_reporting,
            data_export_photos=settings.data_export_photos,
            data_export_analytics=settings.data_export_analytics,
        )

    async def update_privacy_settings(
        self,
        session: AsyncSession,
        user_id: UUID,
        update_data: PrivacySettingsUpdateRequest,
    ) -> PrivacySettingsResponse:
        """Update privacy settings."""
        result = await session.exec(
            select(PrivacySettings).where(PrivacySettings.user_id == user_id)
        )
        settings = result.first()
        
        if not settings:
            settings = PrivacySettings(user_id=user_id)
            session.add(settings)
        
        # Update fields
        for field, value in update_data.model_dump(exclude_unset=True).items():
            if hasattr(settings, field) and value is not None:
                setattr(settings, field, value)
        
        await session.commit()
        await session.refresh(settings)
        
        return PrivacySettingsResponse(
            profile_visibility=settings.profile_visibility,
            location_sharing=settings.location_sharing,
            analytics_collection=settings.analytics_collection,
            crash_reporting=settings.crash_reporting,
            data_export_photos=settings.data_export_photos,
            data_export_analytics=settings.data_export_analytics,
        )

    async def get_user_goals(
        self, session: AsyncSession, user_id: UUID
    ) -> UserGoalsResponse:
        """Get or create user goals."""
        result = await session.exec(
            select(UserGoals).where(UserGoals.user_id == user_id)
        )
        goals = result.scalar_one_or_none()
        
        if not goals:
            # Create default goals
            goals = UserGoals(user_id=user_id)
            session.add(goals)
            await session.commit()
        
        return UserGoalsResponse(
            daily_calories=goals.daily_calories,
            protein_percentage=goals.protein_percentage,
            carbs_percentage=goals.carbs_percentage,
            fat_percentage=goals.fat_percentage,
            meal_frequency=goals.meal_frequency,
            weight_target=goals.weight_target,
            weight_unit=goals.weight_unit,
            weight_timeframe=goals.weight_timeframe,
            water_glasses_target=goals.water_glasses_target,
            fiber_grams_target=goals.fiber_grams_target,
        )

    async def update_user_goals(
        self,
        session: AsyncSession,
        user_id: UUID,
        update_data: UserGoalsUpdateRequest,
    ) -> UserGoalsResponse:
        """Update user goals."""
        # Validate macro percentages if all are provided
        if (
            update_data.protein_percentage is not None
            and update_data.carbs_percentage is not None
            and update_data.fat_percentage is not None
        ):
            total = (
                update_data.protein_percentage
                + update_data.carbs_percentage
                + update_data.fat_percentage
            )
            if total != 100:
                raise BadRequestError(
                    "Protein, carbs, and fat percentages must sum to 100"
                )
        
        result = await session.exec(
            select(UserGoals).where(UserGoals.user_id == user_id)
        )
        goals = result.scalar_one_or_none()
        
        if not goals:
            goals = UserGoals(user_id=user_id)
            session.add(goals)
        
        # Update fields
        for field, value in update_data.model_dump(exclude_unset=True).items():
            if hasattr(goals, field) and value is not None:
                setattr(goals, field, value)
        
        await session.commit()
        await session.refresh(goals)
        
        return UserGoalsResponse(
            daily_calories=goals.daily_calories,
            protein_percentage=goals.protein_percentage,
            carbs_percentage=goals.carbs_percentage,
            fat_percentage=goals.fat_percentage,
            meal_frequency=goals.meal_frequency,
            weight_target=goals.weight_target,
            weight_unit=goals.weight_unit,
            weight_timeframe=goals.weight_timeframe,
            water_glasses_target=goals.water_glasses_target,
            fiber_grams_target=goals.fiber_grams_target,
        )

    async def get_camera_settings(
        self, session: AsyncSession, user_id: UUID
    ) -> CameraSettingsResponse:
        """Get or create camera settings."""
        result = await session.exec(
            select(CameraSettings).where(CameraSettings.user_id == user_id)
        )
        settings = result.first()
        
        if not settings:
            # Create default settings
            settings = CameraSettings(user_id=user_id)
            session.add(settings)
            await session.commit()
        
        return CameraSettingsResponse(
            quality=settings.quality,
            ai_processing=settings.ai_processing,
            auto_capture=settings.auto_capture,
            flash_default=settings.flash_default,
            save_to_gallery=settings.save_to_gallery,
        )

    async def update_camera_settings(
        self,
        session: AsyncSession,
        user_id: UUID,
        update_data: CameraSettingsUpdateRequest,
    ) -> CameraSettingsResponse:
        """Update camera settings."""
        result = await session.exec(
            select(CameraSettings).where(CameraSettings.user_id == user_id)
        )
        settings = result.first()
        
        if not settings:
            settings = CameraSettings(user_id=user_id)
            session.add(settings)
        
        # Update fields
        for field, value in update_data.model_dump(exclude_unset=True).items():
            if hasattr(settings, field) and value is not None:
                setattr(settings, field, value)
        
        await session.commit()
        await session.refresh(settings)
        
        return CameraSettingsResponse(
            quality=settings.quality,
            ai_processing=settings.ai_processing,
            auto_capture=settings.auto_capture,
            flash_default=settings.flash_default,
            save_to_gallery=settings.save_to_gallery,
        )

    async def get_all_settings(
        self, session: AsyncSession, user_id: UUID
    ) -> UserAllSettingsResponse:
        """Get all user settings in one call."""
        preferences = await self.get_user_preferences(session, user_id)
        notifications = await self.get_notification_settings(session, user_id)
        privacy = await self.get_privacy_settings(session, user_id)
        goals = await self.get_user_goals(session, user_id)
        camera = await self.get_camera_settings(session, user_id)
        
        return UserAllSettingsResponse(
            preferences=preferences,
            notifications=notifications,
            privacy=privacy,
            goals=goals,
            camera=camera,
        )

    async def get_user_activity_stats(
        self, session: AsyncSession, user_id: UUID
    ) -> UserActivityStatsResponse:
        """Get user activity statistics."""
        # This is a complex query that aggregates data from meals and other activities
        query = text("""
            WITH user_meals AS (
                SELECT 
                    DATE(created_at) as meal_date,
                    COUNT(*) as meals_count,
                    AVG(COALESCE(calories, 0)) as avg_calories,
                    EXTRACT(hour FROM created_at) as meal_hour
                FROM meals
                WHERE user_id = :user_id AND deleted_at IS NULL
                GROUP BY DATE(created_at), EXTRACT(hour FROM created_at)
            ),
            daily_stats AS (
                SELECT 
                    meal_date,
                    SUM(meals_count) as daily_meals,
                    AVG(avg_calories) as daily_avg_calories
                FROM user_meals
                GROUP BY meal_date
                ORDER BY meal_date
            ),
            streak_calc AS (
                SELECT 
                    meal_date,
                    meal_date - INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY meal_date) - 1) as streak_group
                FROM daily_stats
            ),
            streaks AS (
                SELECT 
                    streak_group,
                    COUNT(*) as streak_length,
                    MIN(meal_date) as streak_start,
                    MAX(meal_date) as streak_end
                FROM streak_calc
                GROUP BY streak_group
                ORDER BY streak_length DESC
            ),
            current_streak AS (
                SELECT 
                    CASE 
                        WHEN MAX(meal_date) = CURRENT_DATE OR MAX(meal_date) = CURRENT_DATE - INTERVAL '1 day'
                        THEN COUNT(*)
                        ELSE 0
                    END as current_streak_days
                FROM (
                    SELECT meal_date
                    FROM daily_stats
                    WHERE meal_date >= (
                        SELECT MAX(meal_date) - INTERVAL '30 days'
                        FROM daily_stats
                    )
                    ORDER BY meal_date DESC
                ) recent_days
                WHERE meal_date >= (
                    SELECT meal_date
                    FROM daily_stats
                    WHERE meal_date <= CURRENT_DATE
                    ORDER BY meal_date DESC
                    LIMIT 1
                ) - INTERVAL '30 days'
            )
            SELECT 
                COALESCE(total_meals.count, 0) as total_meals_logged,
                COALESCE(active_days.count, 0) as total_days_active,
                COALESCE(cs.current_streak_days, 0) as current_streak,
                COALESCE(MAX(s.streak_length), 0) as longest_streak,
                mode_hour.favorite_meal_time,
                COALESCE(daily_avg.avg_calories, 0) as avg_daily_calories,
                NULL as weight_change_kg  -- TODO: Implement when weight tracking is added
            FROM (SELECT 1) dummy
            LEFT JOIN (
                SELECT COUNT(*) as count
                FROM meals
                WHERE user_id = :user_id AND deleted_at IS NULL
            ) total_meals ON true
            LEFT JOIN (
                SELECT COUNT(DISTINCT DATE(created_at)) as count
                FROM meals
                WHERE user_id = :user_id AND deleted_at IS NULL
            ) active_days ON true
            LEFT JOIN current_streak cs ON true
            LEFT JOIN streaks s ON true
            LEFT JOIN (
                SELECT AVG(daily_avg_calories) as avg_calories
                FROM daily_stats
            ) daily_avg ON true
            LEFT JOIN (
                SELECT 
                    CASE 
                        WHEN mode_hour BETWEEN 6 AND 10 THEN 'breakfast'
                        WHEN mode_hour BETWEEN 11 AND 14 THEN 'lunch'
                        WHEN mode_hour BETWEEN 17 AND 21 THEN 'dinner'
                        ELSE 'snack'
                    END as favorite_meal_time
                FROM (
                    SELECT EXTRACT(hour FROM created_at) as mode_hour
                    FROM meals
                    WHERE user_id = :user_id AND deleted_at IS NULL
                    GROUP BY EXTRACT(hour FROM created_at)
                    ORDER BY COUNT(*) DESC
                    LIMIT 1
                ) favorite_hour
            ) mode_hour ON true
        """)
        
        result = await session.exec(query, {"user_id": str(user_id)})
        row = result.mappings().first()
        
        if not row:
            # Return default values if no data
            return UserActivityStatsResponse(
                total_meals_logged=0,
                total_days_active=0,
                current_streak=0,
                longest_streak=0,
                favorite_meal_time=None,
                avg_daily_calories=None,
                weight_change_kg=None,
                goals_achievement_rate=0.0,
            )
        
        # TODO: Calculate goals achievement rate based on actual vs target calories
        goals_achievement_rate = 0.0  # Placeholder
        
        return UserActivityStatsResponse(
            total_meals_logged=row["total_meals_logged"] or 0,
            total_days_active=row["total_days_active"] or 0,
            current_streak=row["current_streak"] or 0,
            longest_streak=row["longest_streak"] or 0,
            favorite_meal_time=row["favorite_meal_time"],
            avg_daily_calories=float(row["avg_daily_calories"]) if row["avg_daily_calories"] else None,
            weight_change_kg=row["weight_change_kg"],
            goals_achievement_rate=goals_achievement_rate,
        )
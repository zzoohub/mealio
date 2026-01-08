"""Analytics domain service."""

from datetime import date, datetime, timedelta, timezone
from typing import Any, List
from uuid import UUID

from sqlalchemy import and_, desc, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.analytics.models import (
    Achievement,
    AnalyticsEvent,
    DailySummary,
    UserProgress,
)
from src.analytics.schemas import (
    AnalyticsEventCreateRequest,
    AnalyticsEventResponse,
    AnalyticsInsightResponse,
    AnalyticsStatsResponse,
    DailySummaryResponse,
    MonthlySummaryResponse,
    UserProgressResponse,
    WeeklySummaryResponse,
)
from src.exceptions import BadRequestError, NotFoundError


class AnalyticsService:
    """Analytics domain business logic."""

    async def track_event(
        self,
        session: AsyncSession,
        user_id: UUID,
        event_data: AnalyticsEventCreateRequest,
    ) -> AnalyticsEventResponse:
        """Track a single analytics event."""
        event = AnalyticsEvent(
            user_id=user_id,
            event_type=event_data.event_type,
            event_category=event_data.event_category,
            properties=event_data.properties,
            session_id=event_data.session_id,
            platform=event_data.platform,
            app_version=event_data.app_version,
        )
        
        session.add(event)
        await session.commit()
        await session.refresh(event)
        
        return AnalyticsEventResponse(
            id=event.id,
            user_id=event.user_id,
            event_type=event.event_type,
            event_category=event.event_category,
            properties=event.properties,
            session_id=event.session_id,
            platform=event.platform,
            app_version=event.app_version,
            created_at=event.created_at,
        )

    async def track_events_batch(
        self,
        session: AsyncSession,
        user_id: UUID,
        events_data: list[AnalyticsEventCreateRequest],
    ) -> list[AnalyticsEventResponse]:
        """Track multiple analytics events in batch."""
        if len(events_data) > 100:
            raise BadRequestError("Maximum 100 events allowed per batch")
        
        events = []
        for event_data in events_data:
            event = AnalyticsEvent(
                user_id=user_id,
                event_type=event_data.event_type,
                event_category=event_data.event_category,
                properties=event_data.properties,
                session_id=event_data.session_id,
                platform=event_data.platform,
                app_version=event_data.app_version,
            )
            events.append(event)
        
        session.add_all(events)
        await session.commit()
        
        # Refresh to get IDs and timestamps
        for event in events:
            await session.refresh(event)
        
        return [
            AnalyticsEventResponse(
                id=event.id,
                user_id=event.user_id,
                event_type=event.event_type,
                event_category=event.event_category,
                properties=event.properties,
                session_id=event.session_id,
                platform=event.platform,
                app_version=event.app_version,
                created_at=event.created_at,
            )
            for event in events
        ]

    async def get_or_create_daily_summary(
        self,
        session: AsyncSession,
        user_id: UUID,
        summary_date: date,
    ) -> DailySummary:
        """Get or create daily summary for a user and date."""
        result = await session.exec(
            select(DailySummary).where(
                and_(
                    DailySummary.user_id == user_id,
                    DailySummary.summary_date == summary_date,
                )
            )
        )
        summary = result.first()
        
        if not summary:
            summary = DailySummary(
                user_id=user_id,
                summary_date=summary_date,
            )
            session.add(summary)
            await session.commit()
            await session.refresh(summary)
        
        return summary

    async def update_daily_summary(
        self,
        session: AsyncSession,
        user_id: UUID,
        summary_date: date,
        **updates: Any,
    ) -> DailySummaryResponse:
        """Update daily summary with new data."""
        summary = await self.get_or_create_daily_summary(session, user_id, summary_date)
        
        for field, value in updates.items():
            if hasattr(summary, field) and value is not None:
                setattr(summary, field, value)
        
        # Recalculate scores
        summary.nutrition_score = await self._calculate_nutrition_score(session, summary)
        summary.consistency_score = await self._calculate_consistency_score(session, summary)
        summary.social_engagement_score = await self._calculate_social_score(session, summary)
        summary.overall_score = (
            summary.nutrition_score + summary.consistency_score + summary.social_engagement_score
        ) / 3
        
        await session.commit()
        await session.refresh(summary)
        
        return DailySummaryResponse(
            id=summary.id,
            user_id=summary.user_id,
            summary_date=summary.summary_date,
            meals_logged=summary.meals_logged,
            total_calories=summary.total_calories,
            total_protein_g=summary.total_protein_g,
            total_carbs_g=summary.total_carbs_g,
            total_fat_g=summary.total_fat_g,
            total_fiber_g=summary.total_fiber_g,
            water_glasses=summary.water_glasses,
            app_sessions=summary.app_sessions,
            total_app_time_minutes=summary.total_app_time_minutes,
            photos_taken=summary.photos_taken,
            posts_created=summary.posts_created,
            likes_given=summary.likes_given,
            comments_made=summary.comments_made,
            calorie_goal_met=summary.calorie_goal_met,
            protein_goal_met=summary.protein_goal_met,
            water_goal_met=summary.water_goal_met,
            meal_frequency_goal_met=summary.meal_frequency_goal_met,
            nutrition_score=summary.nutrition_score,
            consistency_score=summary.consistency_score,
            social_engagement_score=summary.social_engagement_score,
            overall_score=summary.overall_score,
            created_at=summary.created_at,
            updated_at=summary.updated_at,
        )

    async def get_daily_summary(
        self,
        session: AsyncSession,
        user_id: UUID,
        summary_date: date,
    ) -> DailySummaryResponse | None:
        """Get daily summary for a specific date."""
        result = await session.exec(
            select(DailySummary).where(
                and_(
                    DailySummary.user_id == user_id,
                    DailySummary.summary_date == summary_date,
                )
            )
        )
        summary = result.first()
        
        if not summary:
            return None
        
        return DailySummaryResponse(
            id=summary.id,
            user_id=summary.user_id,
            summary_date=summary.summary_date,
            meals_logged=summary.meals_logged,
            total_calories=summary.total_calories,
            total_protein_g=summary.total_protein_g,
            total_carbs_g=summary.total_carbs_g,
            total_fat_g=summary.total_fat_g,
            total_fiber_g=summary.total_fiber_g,
            water_glasses=summary.water_glasses,
            app_sessions=summary.app_sessions,
            total_app_time_minutes=summary.total_app_time_minutes,
            photos_taken=summary.photos_taken,
            posts_created=summary.posts_created,
            likes_given=summary.likes_given,
            comments_made=summary.comments_made,
            calorie_goal_met=summary.calorie_goal_met,
            protein_goal_met=summary.protein_goal_met,
            water_goal_met=summary.water_goal_met,
            meal_frequency_goal_met=summary.meal_frequency_goal_met,
            nutrition_score=summary.nutrition_score,
            consistency_score=summary.consistency_score,
            social_engagement_score=summary.social_engagement_score,
            overall_score=summary.overall_score,
            created_at=summary.created_at,
            updated_at=summary.updated_at,
        )

    async def get_weekly_summary(
        self,
        session: AsyncSession,
        user_id: UUID,
        week_start_date: date,
    ) -> WeeklySummaryResponse:
        """Get weekly summary aggregated from daily summaries."""
        week_end_date = week_start_date + timedelta(days=6)
        
        # Get daily summaries for the week
        result = await session.exec(
            select(DailySummary).where(
                and_(
                    DailySummary.user_id == user_id,
                    DailySummary.summary_date >= week_start_date,
                    DailySummary.summary_date <= week_end_date,
                )
            ).order_by(DailySummary.summary_date)
        )
        daily_summaries = result.scalars().all()
        
        # Convert to response objects
        daily_responses = [
            DailySummaryResponse(
                id=summary.id,
                user_id=summary.user_id,
                summary_date=summary.summary_date,
                meals_logged=summary.meals_logged,
                total_calories=summary.total_calories,
                total_protein_g=summary.total_protein_g,
                total_carbs_g=summary.total_carbs_g,
                total_fat_g=summary.total_fat_g,
                total_fiber_g=summary.total_fiber_g,
                water_glasses=summary.water_glasses,
                app_sessions=summary.app_sessions,
                total_app_time_minutes=summary.total_app_time_minutes,
                photos_taken=summary.photos_taken,
                posts_created=summary.posts_created,
                likes_given=summary.likes_given,
                comments_made=summary.comments_made,
                calorie_goal_met=summary.calorie_goal_met,
                protein_goal_met=summary.protein_goal_met,
                water_goal_met=summary.water_goal_met,
                meal_frequency_goal_met=summary.meal_frequency_goal_met,
                nutrition_score=summary.nutrition_score,
                consistency_score=summary.consistency_score,
                social_engagement_score=summary.social_engagement_score,
                overall_score=summary.overall_score,
                created_at=summary.created_at,
                updated_at=summary.updated_at,
            )
            for summary in daily_summaries
        ]
        
        if not daily_summaries:
            # Return empty week summary
            return WeeklySummaryResponse(
                week_start_date=week_start_date,
                week_end_date=week_end_date,
                total_meals_logged=0,
                avg_daily_calories=0.0,
                avg_daily_protein_g=0.0,
                avg_daily_carbs_g=0.0,
                avg_daily_fat_g=0.0,
                total_water_glasses=0,
                total_photos_taken=0,
                calorie_goal_achievement_rate=0.0,
                protein_goal_achievement_rate=0.0,
                water_goal_achievement_rate=0.0,
                meal_frequency_goal_achievement_rate=0.0,
                avg_nutrition_score=0.0,
                avg_consistency_score=0.0,
                avg_social_engagement_score=0.0,
                avg_overall_score=0.0,
                daily_summaries=daily_responses,
            )
        
        # Aggregate metrics
        total_meals = sum(s.meals_logged for s in daily_summaries)
        total_calories = sum(s.total_calories for s in daily_summaries)
        total_protein = sum(s.total_protein_g for s in daily_summaries)
        total_carbs = sum(s.total_carbs_g for s in daily_summaries)
        total_fat = sum(s.total_fat_g for s in daily_summaries)
        total_water = sum(s.water_glasses for s in daily_summaries)
        total_photos = sum(s.photos_taken for s in daily_summaries)
        
        days_count = len(daily_summaries)
        
        # Goal achievement rates
        calorie_goals_met = sum(1 for s in daily_summaries if s.calorie_goal_met)
        protein_goals_met = sum(1 for s in daily_summaries if s.protein_goal_met)
        water_goals_met = sum(1 for s in daily_summaries if s.water_goal_met)
        meal_freq_goals_met = sum(1 for s in daily_summaries if s.meal_frequency_goal_met)
        
        return WeeklySummaryResponse(
            week_start_date=week_start_date,
            week_end_date=week_end_date,
            total_meals_logged=total_meals,
            avg_daily_calories=total_calories / days_count,
            avg_daily_protein_g=total_protein / days_count,
            avg_daily_carbs_g=total_carbs / days_count,
            avg_daily_fat_g=total_fat / days_count,
            total_water_glasses=total_water,
            total_photos_taken=total_photos,
            calorie_goal_achievement_rate=(calorie_goals_met / days_count) * 100,
            protein_goal_achievement_rate=(protein_goals_met / days_count) * 100,
            water_goal_achievement_rate=(water_goals_met / days_count) * 100,
            meal_frequency_goal_achievement_rate=(meal_freq_goals_met / days_count) * 100,
            avg_nutrition_score=sum(s.nutrition_score for s in daily_summaries) / days_count,
            avg_consistency_score=sum(s.consistency_score for s in daily_summaries) / days_count,
            avg_social_engagement_score=sum(s.social_engagement_score for s in daily_summaries) / days_count,
            avg_overall_score=sum(s.overall_score for s in daily_summaries) / days_count,
            daily_summaries=daily_responses,
        )

    async def get_user_progress(
        self,
        session: AsyncSession,
        user_id: UUID,
    ) -> UserProgressResponse:
        """Get or create user progress."""
        result = await session.exec(
            select(UserProgress).where(UserProgress.user_id == user_id)
        )
        progress = result.first()
        
        if not progress:
            progress = UserProgress(user_id=user_id)
            session.add(progress)
            await session.commit()
            await session.refresh(progress)
        
        return UserProgressResponse(
            user_id=progress.user_id,
            current_logging_streak=progress.current_logging_streak,
            longest_logging_streak=progress.longest_logging_streak,
            current_goal_streak=progress.current_goal_streak,
            longest_goal_streak=progress.longest_goal_streak,
            first_meal_logged_at=progress.first_meal_logged_at,
            first_goal_met_at=progress.first_goal_met_at,
            first_social_post_at=progress.first_social_post_at,
            last_active_date=progress.last_active_date,
            total_meals_logged=progress.total_meals_logged,
            total_days_active=progress.total_days_active,
            total_photos_taken=progress.total_photos_taken,
            total_social_interactions=progress.total_social_interactions,
            avg_daily_calories=progress.avg_daily_calories,
            avg_nutrition_score=progress.avg_nutrition_score,
            avg_consistency_score=progress.avg_consistency_score,
            updated_at=progress.updated_at,
        )

    async def generate_insights(
        self,
        session: AsyncSession,
        user_id: UUID,
    ) -> list[AnalyticsInsightResponse]:
        """Generate personalized insights for the user."""
        insights = []
        
        # Get recent daily summaries for analysis
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        result = await session.exec(
            select(DailySummary).where(
                and_(
                    DailySummary.user_id == user_id,
                    DailySummary.summary_date >= start_date,
                    DailySummary.summary_date <= end_date,
                )
            ).order_by(desc(DailySummary.summary_date))
        )
        recent_summaries = result.scalars().all()
        
        if not recent_summaries:
            return insights
        
        # Check for current streak
        consecutive_days = 0
        for i, summary in enumerate(recent_summaries):
            expected_date = end_date - timedelta(days=i)
            if summary.summary_date == expected_date and summary.meals_logged > 0:
                consecutive_days += 1
            else:
                break
        
        if consecutive_days >= 7:
            insights.append(
                AnalyticsInsightResponse(
                    insight_type="streak",
                    title=f"Amazing {consecutive_days}-Day Streak!",
                    description=f"You've been consistently logging meals for {consecutive_days} days straight. Keep up the excellent work!",
                    data={"streak_days": consecutive_days},
                    action_recommended="Continue your streak by logging your next meal",
                    created_at=datetime.now(timezone.utc),
                )
            )
        elif consecutive_days >= 3:
            insights.append(
                AnalyticsInsightResponse(
                    insight_type="streak",
                    title=f"Great {consecutive_days}-Day Streak!",
                    description=f"You're building a healthy habit! {consecutive_days} days of consistent logging.",
                    data={"streak_days": consecutive_days},
                    action_recommended="Keep going! Try to reach a full week",
                    created_at=datetime.now(timezone.utc),
                )
            )
        
        # Check nutrition trends
        if len(recent_summaries) >= 7:
            recent_week = recent_summaries[:7]
            previous_week = recent_summaries[7:14] if len(recent_summaries) >= 14 else []
            
            if previous_week:
                recent_avg_nutrition = sum(s.nutrition_score for s in recent_week) / len(recent_week)
                previous_avg_nutrition = sum(s.nutrition_score for s in previous_week) / len(previous_week)
                improvement = recent_avg_nutrition - previous_avg_nutrition
                
                if improvement >= 5:
                    insights.append(
                        AnalyticsInsightResponse(
                            insight_type="improvement",
                            title="Nutrition Score Improving!",
                            description=f"Your nutrition score improved by {improvement:.1f} points this week compared to last week.",
                            data={
                                "recent_score": recent_avg_nutrition,
                                "previous_score": previous_avg_nutrition,
                                "improvement": improvement,
                            },
                            action_recommended="Keep focusing on balanced meals to maintain this trend",
                            created_at=datetime.now(timezone.utc),
                        )
                    )
        
        return insights

    async def _calculate_nutrition_score(
        self,
        session: AsyncSession,
        summary: DailySummary,
    ) -> float:
        """Calculate nutrition score based on goals achievement and balance."""
        score = 0.0
        
        # Goal achievement (60% of score)
        goals_met = sum([
            summary.calorie_goal_met,
            summary.protein_goal_met,
            summary.water_goal_met,
            summary.meal_frequency_goal_met,
        ])
        score += (goals_met / 4) * 60
        
        # Meal logging consistency (20% of score)
        if summary.meals_logged >= 3:
            score += 20
        elif summary.meals_logged >= 2:
            score += 15
        elif summary.meals_logged >= 1:
            score += 10
        
        # Macro balance (20% of score)
        # This is a simplified calculation - in reality you'd want more sophisticated logic
        if summary.total_protein_g > 0 and summary.total_carbs_g > 0 and summary.total_fat_g > 0:
            score += 20
        
        return min(100.0, score)

    async def _calculate_consistency_score(
        self,
        session: AsyncSession,
        summary: DailySummary,
    ) -> float:
        """Calculate consistency score based on regular logging patterns."""
        # This is a simplified calculation
        # In reality, you'd analyze patterns over multiple days
        score = 0.0
        
        if summary.meals_logged >= 3:
            score = 100.0
        elif summary.meals_logged >= 2:
            score = 70.0
        elif summary.meals_logged >= 1:
            score = 40.0
        
        return score

    async def _calculate_social_score(
        self,
        session: AsyncSession,
        summary: DailySummary,
    ) -> float:
        """Calculate social engagement score."""
        score = 0.0
        
        # Posts created (40% of score)
        if summary.posts_created >= 1:
            score += min(40, summary.posts_created * 20)
        
        # Likes given (30% of score)
        if summary.likes_given >= 1:
            score += min(30, summary.likes_given * 5)
        
        # Comments made (30% of score)
        if summary.comments_made >= 1:
            score += min(30, summary.comments_made * 10)
        
        return min(100.0, score)
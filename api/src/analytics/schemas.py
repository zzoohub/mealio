"""Analytics domain schemas."""

from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AnalyticsEventCreateRequest(BaseModel):
    """Create analytics event request schema."""
    
    event_type: str = Field(..., min_length=1, max_length=100)
    event_category: Literal["app", "meal", "social", "camera", "settings"]
    properties: dict[str, Any] | None = Field(default=None)
    session_id: str | None = Field(default=None, max_length=100)
    platform: Literal["ios", "android", "web"] | None = Field(default=None)
    app_version: str | None = Field(default=None, max_length=20)


class AnalyticsEventResponse(BaseModel):
    """Analytics event response schema."""
    
    id: UUID
    user_id: UUID
    event_type: str
    event_category: Literal["app", "meal", "social", "camera", "settings"]
    properties: dict[str, Any] | None
    session_id: str | None
    platform: Literal["ios", "android", "web"] | None
    app_version: str | None
    created_at: datetime


class DailySummaryResponse(BaseModel):
    """Daily summary response schema."""
    
    id: UUID
    user_id: UUID
    summary_date: date
    
    # Meal metrics
    meals_logged: int
    total_calories: int
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_fiber_g: float
    water_glasses: int
    
    # Activity metrics
    app_sessions: int
    total_app_time_minutes: int
    photos_taken: int
    
    # Social metrics
    posts_created: int
    likes_given: int
    comments_made: int
    
    # Goals achievement
    calorie_goal_met: bool
    protein_goal_met: bool
    water_goal_met: bool
    meal_frequency_goal_met: bool
    
    # Scores
    nutrition_score: float
    consistency_score: float
    social_engagement_score: float
    overall_score: float
    
    created_at: datetime
    updated_at: datetime


class UserProgressResponse(BaseModel):
    """User progress response schema."""
    
    user_id: UUID
    
    # Streaks
    current_logging_streak: int
    longest_logging_streak: int
    current_goal_streak: int
    longest_goal_streak: int
    
    # Achievement dates
    first_meal_logged_at: datetime | None
    first_goal_met_at: datetime | None
    first_social_post_at: datetime | None
    last_active_date: date | None
    
    # Totals
    total_meals_logged: int
    total_days_active: int
    total_photos_taken: int
    total_social_interactions: int
    
    # Averages
    avg_daily_calories: float | None
    avg_nutrition_score: float
    avg_consistency_score: float
    
    updated_at: datetime


class AchievementResponse(BaseModel):
    """Achievement response schema."""
    
    id: UUID
    user_id: UUID
    achievement_type: str
    achievement_level: int
    unlocked_at: datetime
    progress: float
    achievement_metadata: dict[str, Any] | None


class WeeklySummaryResponse(BaseModel):
    """Weekly summary response schema."""
    
    week_start_date: date
    week_end_date: date
    
    # Aggregate metrics
    total_meals_logged: int
    avg_daily_calories: float
    avg_daily_protein_g: float
    avg_daily_carbs_g: float
    avg_daily_fat_g: float
    total_water_glasses: int
    total_photos_taken: int
    
    # Goal achievement rates (0-100)
    calorie_goal_achievement_rate: float
    protein_goal_achievement_rate: float
    water_goal_achievement_rate: float
    meal_frequency_goal_achievement_rate: float
    
    # Average scores
    avg_nutrition_score: float
    avg_consistency_score: float
    avg_social_engagement_score: float
    avg_overall_score: float
    
    # Day-by-day breakdown
    daily_summaries: list[DailySummaryResponse]


class MonthlySummaryResponse(BaseModel):
    """Monthly summary response schema."""
    
    month: int
    year: int
    
    # Aggregate metrics
    total_meals_logged: int
    total_days_active: int
    avg_daily_calories: float
    total_photos_taken: int
    
    # Best achievements this month
    best_nutrition_score: float
    best_consistency_score: float
    longest_streak_this_month: int
    
    # Goal achievement rates
    calorie_goal_achievement_rate: float
    protein_goal_achievement_rate: float
    water_goal_achievement_rate: float
    
    # Trends (compared to previous month)
    calories_trend: float  # percentage change
    meals_trend: float     # percentage change
    score_trend: float     # percentage change


class AnalyticsInsightResponse(BaseModel):
    """Analytics insight response schema."""
    
    insight_type: Literal["streak", "goal", "improvement", "milestone", "recommendation"]
    title: str
    description: str
    data: dict[str, Any] | None = None
    action_recommended: str | None = None
    created_at: datetime


class EventBatchRequest(BaseModel):
    """Batch event creation request schema."""
    
    events: list[AnalyticsEventCreateRequest] = Field(..., max_items=100)


class AnalyticsStatsResponse(BaseModel):
    """Overall analytics statistics response schema."""
    
    # Time-based stats
    today_summary: DailySummaryResponse | None
    this_week_summary: WeeklySummaryResponse | None
    this_month_summary: MonthlySummaryResponse | None
    
    # Progress
    user_progress: UserProgressResponse
    
    # Recent achievements
    recent_achievements: list[AchievementResponse]
    
    # Insights
    insights: list[AnalyticsInsightResponse]
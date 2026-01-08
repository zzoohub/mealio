"""Users domain schemas."""

from datetime import time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class UserPreferencesResponse(BaseModel):
    """User preferences response schema."""
    
    language: Literal["en", "ko"]
    theme: Literal["light", "dark", "system"]
    measurement_units: Literal["metric", "imperial"]


class UserPreferencesUpdateRequest(BaseModel):
    """User preferences update request schema."""
    
    language: Literal["en", "ko"] | None = None
    theme: Literal["light", "dark", "system"] | None = None
    measurement_units: Literal["metric", "imperial"] | None = None


class NotificationSettingsResponse(BaseModel):
    """Notification settings response schema."""
    
    meal_reminders: bool
    social_notifications: bool
    progress_updates: bool
    ai_insights: bool
    quiet_hours_enabled: bool
    quiet_hours_start: time
    quiet_hours_end: time
    frequency: Literal["immediate", "daily", "weekly"]
    push_enabled: bool
    email_enabled: bool


class NotificationSettingsUpdateRequest(BaseModel):
    """Notification settings update request schema."""
    
    meal_reminders: bool | None = None
    social_notifications: bool | None = None
    progress_updates: bool | None = None
    ai_insights: bool | None = None
    quiet_hours_enabled: bool | None = None
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None
    frequency: Literal["immediate", "daily", "weekly"] | None = None
    push_enabled: bool | None = None
    email_enabled: bool | None = None


class PrivacySettingsResponse(BaseModel):
    """Privacy settings response schema."""
    
    profile_visibility: Literal["public", "friends", "private"]
    location_sharing: bool
    analytics_collection: bool
    crash_reporting: bool
    data_export_photos: bool
    data_export_analytics: bool


class PrivacySettingsUpdateRequest(BaseModel):
    """Privacy settings update request schema."""
    
    profile_visibility: Literal["public", "friends", "private"] | None = None
    location_sharing: bool | None = None
    analytics_collection: bool | None = None
    crash_reporting: bool | None = None
    data_export_photos: bool | None = None
    data_export_analytics: bool | None = None


class UserGoalsResponse(BaseModel):
    """User goals response schema."""
    
    daily_calories: int
    protein_percentage: int
    carbs_percentage: int
    fat_percentage: int
    meal_frequency: int
    weight_target: Decimal | None
    weight_unit: Literal["kg", "lbs"]
    weight_timeframe: Literal["weekly", "monthly"]
    water_glasses_target: int
    fiber_grams_target: int


class UserGoalsUpdateRequest(BaseModel):
    """User goals update request schema."""
    
    daily_calories: int | None = Field(None, ge=1, le=10000)
    protein_percentage: int | None = Field(None, ge=0, le=100)
    carbs_percentage: int | None = Field(None, ge=0, le=100)
    fat_percentage: int | None = Field(None, ge=0, le=100)
    meal_frequency: int | None = Field(None, ge=1, le=10)
    weight_target: Decimal | None = Field(None, max_digits=5, decimal_places=2)
    weight_unit: Literal["kg", "lbs"] | None = None
    weight_timeframe: Literal["weekly", "monthly"] | None = None
    water_glasses_target: int | None = Field(None, ge=1, le=20)
    fiber_grams_target: int | None = Field(None, ge=1, le=100)

    def validate_macro_percentages(self) -> "UserGoalsUpdateRequest":
        """Validate that macro percentages sum to 100."""
        protein = self.protein_percentage
        carbs = self.carbs_percentage
        fat = self.fat_percentage
        
        # Only validate if all three are provided
        if protein is not None and carbs is not None and fat is not None:
            if protein + carbs + fat != 100:
                raise ValueError("Protein, carbs, and fat percentages must sum to 100")
        
        return self


class CameraSettingsResponse(BaseModel):
    """Camera settings response schema."""
    
    quality: Literal["low", "medium", "high"]
    ai_processing: bool
    auto_capture: bool
    flash_default: Literal["auto", "on", "off"]
    save_to_gallery: bool


class CameraSettingsUpdateRequest(BaseModel):
    """Camera settings update request schema."""
    
    quality: Literal["low", "medium", "high"] | None = None
    ai_processing: bool | None = None
    auto_capture: bool | None = None
    flash_default: Literal["auto", "on", "off"] | None = None
    save_to_gallery: bool | None = None


class UserAllSettingsResponse(BaseModel):
    """Combined user settings response schema."""
    
    preferences: UserPreferencesResponse
    notifications: NotificationSettingsResponse
    privacy: PrivacySettingsResponse
    goals: UserGoalsResponse
    camera: CameraSettingsResponse


class UserProfileUpdateRequest(BaseModel):
    """User profile update request schema."""
    
    username: str | None = Field(None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    email: str | None = None
    avatar_url: str | None = None


class UserActivityStatsResponse(BaseModel):
    """User activity statistics response schema."""
    
    total_meals_logged: int
    total_days_active: int
    current_streak: int
    longest_streak: int
    favorite_meal_time: str | None  # e.g., "breakfast", "lunch", "dinner"
    avg_daily_calories: float | None
    weight_change_kg: float | None  # positive = gain, negative = loss
    goals_achievement_rate: float  # percentage 0-100
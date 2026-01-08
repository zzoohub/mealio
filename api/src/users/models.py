"""User preferences and settings models."""

from datetime import time
from decimal import Decimal
from enum import Enum
from uuid import UUID

from sqlalchemy import CheckConstraint
from sqlmodel import Field, Relationship, SQLModel

from src.auth.models import User
from src.models import TimestampMixin


class Language(str, Enum):
    """Language enum."""
    EN = "en"
    KO = "ko"


class Theme(str, Enum):
    """Theme enum."""
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"


class MeasurementUnits(str, Enum):
    """Measurement units enum."""
    METRIC = "metric"
    IMPERIAL = "imperial"


class NotificationFrequency(str, Enum):
    """Notification frequency enum."""
    IMMEDIATE = "immediate"
    DAILY = "daily"
    WEEKLY = "weekly"


class ProfileVisibility(str, Enum):
    """Profile visibility enum."""
    PUBLIC = "public"
    FRIENDS = "friends"
    PRIVATE = "private"


class WeightUnit(str, Enum):
    """Weight unit enum."""
    KG = "kg"
    LBS = "lbs"


class WeightTimeframe(str, Enum):
    """Weight timeframe enum."""
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class CameraQuality(str, Enum):
    """Camera quality enum."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class FlashSetting(str, Enum):
    """Flash setting enum."""
    AUTO = "auto"
    ON = "on"
    OFF = "off"


class UserPreferences(TimestampMixin, SQLModel, table=True):
    """User preferences model."""

    __tablename__ = "user_preferences"

    user_id: UUID = Field(foreign_key="users.id", primary_key=True)
    language: Language = Field(default=Language.EN)
    theme: Theme = Field(default=Theme.SYSTEM)
    measurement_units: MeasurementUnits = Field(default=MeasurementUnits.METRIC)

    # Relationship
    user: User = Relationship()


class NotificationSettings(TimestampMixin, SQLModel, table=True):
    """Notification settings model."""

    __tablename__ = "notification_settings"

    user_id: UUID = Field(foreign_key="users.id", primary_key=True)
    meal_reminders: bool = Field(default=True)
    social_notifications: bool = Field(default=True)
    progress_updates: bool = Field(default=True)
    ai_insights: bool = Field(default=True)
    quiet_hours_enabled: bool = Field(default=True)
    quiet_hours_start: time = Field(default=time(22, 0))
    quiet_hours_end: time = Field(default=time(7, 0))
    frequency: NotificationFrequency = Field(default=NotificationFrequency.IMMEDIATE)
    push_enabled: bool = Field(default=True)
    email_enabled: bool = Field(default=False)

    # Relationship
    user: User = Relationship()


class PrivacySettings(TimestampMixin, SQLModel, table=True):
    """Privacy settings model."""

    __tablename__ = "privacy_settings"

    user_id: UUID = Field(foreign_key="users.id", primary_key=True)
    profile_visibility: ProfileVisibility = Field(default=ProfileVisibility.FRIENDS)
    location_sharing: bool = Field(default=False)
    analytics_collection: bool = Field(default=True)
    crash_reporting: bool = Field(default=True)
    data_export_photos: bool = Field(default=True)
    data_export_analytics: bool = Field(default=False)

    # Relationship
    user: User = Relationship()


class UserGoals(TimestampMixin, SQLModel, table=True):
    """User goals model."""

    __tablename__ = "user_goals"
    __table_args__ = (
        CheckConstraint(
            "protein_percentage + carbs_percentage + fat_percentage = 100",
            name="valid_macro_percentages",
        ),
    )

    user_id: UUID = Field(foreign_key="users.id", primary_key=True)
    daily_calories: int = Field(default=2000, ge=0)
    protein_percentage: int = Field(default=25, ge=0, le=100)
    carbs_percentage: int = Field(default=45, ge=0, le=100)
    fat_percentage: int = Field(default=30, ge=0, le=100)
    meal_frequency: int = Field(default=3, ge=1, le=10)
    weight_target: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    weight_unit: WeightUnit = Field(default=WeightUnit.KG)
    weight_timeframe: WeightTimeframe = Field(default=WeightTimeframe.MONTHLY)
    water_glasses_target: int = Field(default=8, ge=1)
    fiber_grams_target: int = Field(default=25, ge=1)

    # Relationship
    user: User = Relationship()


class CameraSettings(TimestampMixin, SQLModel, table=True):
    """Camera settings model."""

    __tablename__ = "camera_settings"

    user_id: UUID = Field(foreign_key="users.id", primary_key=True)
    quality: CameraQuality = Field(default=CameraQuality.HIGH)
    ai_processing: bool = Field(default=True)
    auto_capture: bool = Field(default=False)
    flash_default: FlashSetting = Field(default=FlashSetting.AUTO)
    save_to_gallery: bool = Field(default=True)

    # Relationship
    user: User = Relationship()
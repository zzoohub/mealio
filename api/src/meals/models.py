"""Meal domain models."""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

from src.auth.models import User
from src.models import BaseModel, SoftDeleteMixin, TimestampMixin, UUIDMixin


class MealType(str, Enum):
    """Meal type enum."""
    
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class Meal(BaseModel, SoftDeleteMixin, table=True):
    """Meal model."""

    __tablename__ = "meals"

    user_id: UUID = Field(foreign_key="users.id", index=True)
    name: str = Field(max_length=255)
    meal_type: MealType = Field(nullable=False)
    timestamp: datetime = Field(nullable=False, index=True)

    # Nutrition information
    calories: int | None = Field(default=None, ge=0)
    protein: Decimal | None = Field(default=None, max_digits=8, decimal_places=2, ge=0)
    carbs: Decimal | None = Field(default=None, max_digits=8, decimal_places=2, ge=0)
    fat: Decimal | None = Field(default=None, max_digits=8, decimal_places=2, ge=0)
    fiber: Decimal | None = Field(default=None, max_digits=8, decimal_places=2, ge=0)
    sugar: Decimal | None = Field(default=None, max_digits=8, decimal_places=2, ge=0)
    sodium: Decimal | None = Field(default=None, max_digits=8, decimal_places=2, ge=0)
    water: Decimal | None = Field(default=None, max_digits=8, decimal_places=2, ge=0)

    # Additional information
    notes: str | None = Field(default=None)
    is_verified: bool = Field(default=False)

    # Location (stored as JSON for simplicity, PostGIS in production)
    location: dict | None = Field(default=None)
    location_name: str | None = Field(default=None, max_length=255)
    restaurant_name: str | None = Field(default=None, max_length=255)

    # Relationships
    user: User = Relationship()
    photos: list["MealPhoto"] = Relationship(
        back_populates="meal",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    ingredients: list["MealIngredient"] = Relationship(
        back_populates="meal",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    ai_analysis: "AIAnalysis | None" = Relationship(
        back_populates="meal",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False},
    )


class MealPhoto(UUIDMixin, TimestampMixin, SQLModel, table=True):
    """Meal photo model."""

    __tablename__ = "meal_photos"

    meal_id: UUID = Field(foreign_key="meals.id", nullable=False, index=True)
    photo_url: str = Field(nullable=False)
    thumbnail_url: str | None = Field(default=None)
    width: int | None = Field(default=None)
    height: int | None = Field(default=None)
    file_size: int | None = Field(default=None)  # bytes
    mime_type: str | None = Field(default=None, max_length=50)
    display_order: int = Field(default=0)

    # Relationship
    meal: Meal = Relationship(back_populates="photos")


class MealIngredient(UUIDMixin, TimestampMixin, SQLModel, table=True):
    """Meal ingredient model."""

    __tablename__ = "meal_ingredients"

    meal_id: UUID = Field(foreign_key="meals.id", nullable=False, index=True)
    ingredient_name: str = Field(max_length=255)
    quantity: Decimal | None = Field(default=None, max_digits=10, decimal_places=3)
    unit: str | None = Field(default=None, max_length=50)
    calories_per_serving: Decimal | None = Field(default=None, max_digits=8, decimal_places=2)
    display_order: int = Field(default=0)

    # Relationship
    meal: Meal = Relationship(back_populates="ingredients")


class AIAnalysis(UUIDMixin, TimestampMixin, SQLModel, table=True):
    """AI analysis model."""

    __tablename__ = "ai_analyses"

    meal_id: UUID = Field(foreign_key="meals.id", nullable=False, unique=True, index=True)
    detected_items: list[dict] = Field()
    confidence: Decimal | None = Field(default=None, max_digits=3, decimal_places=2, ge=0, le=1)
    estimated_calories: int | None = Field(default=None)
    suggested_meal_type: str | None = Field(default=None, max_length=20)
    cuisine_type: str | None = Field(default=None, max_length=100)

    # AI insights
    health_score: int | None = Field(default=None, ge=0, le=100)
    nutrition_balance: str | None = Field(default=None)
    recommendations: list[str] | None = Field(default=None)
    warnings: list[str] | None = Field(default=None)

    # Processing metadata
    ai_model_version: str | None = Field(default=None, max_length=50)
    processing_time_ms: int | None = Field(default=None)

    # Relationship
    meal: Meal = Relationship(back_populates="ai_analysis")
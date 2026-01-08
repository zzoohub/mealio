"""Meal domain schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class MealIngredientBase(BaseModel):
    """Base meal ingredient schema."""

    ingredient_name: str = Field(..., min_length=1, max_length=255)
    quantity: Decimal | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=50)
    calories_per_serving: Decimal | None = Field(default=None, ge=0)


class MealIngredientCreate(MealIngredientBase):
    """Create meal ingredient schema."""

    display_order: int = Field(default=0)


class MealIngredientResponse(MealIngredientBase):
    """Meal ingredient response schema."""

    id: UUID
    display_order: int
    created_at: datetime


class MealPhotoBase(BaseModel):
    """Base meal photo schema."""

    photo_url: str
    thumbnail_url: str | None = None
    width: int | None = None
    height: int | None = None
    file_size: int | None = None
    mime_type: str | None = None


class MealPhotoCreate(MealPhotoBase):
    """Create meal photo schema."""

    display_order: int = Field(default=0)


class MealPhotoResponse(MealPhotoBase):
    """Meal photo response schema."""

    id: UUID
    display_order: int
    created_at: datetime


class AIAnalysisResponse(BaseModel):
    """AI analysis response schema."""

    id: UUID
    detected_items: list[dict]
    confidence: Decimal | None
    estimated_calories: int | None
    suggested_meal_type: str | None
    cuisine_type: str | None
    health_score: int | None
    nutrition_balance: str | None
    recommendations: list[str] | None
    warnings: list[str] | None
    ai_model_version: str | None
    processing_time_ms: int | None
    created_at: datetime


class MealBase(BaseModel):
    """Base meal schema."""

    name: str = Field(..., min_length=1, max_length=255)
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    timestamp: datetime
    notes: str | None = Field(default=None, max_length=1000)
    location_name: str | None = Field(default=None, max_length=255)
    restaurant_name: str | None = Field(default=None, max_length=255)


class MealNutrition(BaseModel):
    """Meal nutrition schema."""

    calories: int | None = Field(default=None, ge=0)
    protein: Decimal | None = Field(default=None, ge=0)
    carbs: Decimal | None = Field(default=None, ge=0)
    fat: Decimal | None = Field(default=None, ge=0)
    fiber: Decimal | None = Field(default=None, ge=0)
    sugar: Decimal | None = Field(default=None, ge=0)
    sodium: Decimal | None = Field(default=None, ge=0)
    water: Decimal | None = Field(default=None, ge=0)


class MealCreate(MealBase, MealNutrition):
    """Create meal request schema."""

    ingredients: list[MealIngredientCreate] = Field(default_factory=list)
    photos: list[MealPhotoCreate] = Field(default_factory=list)
    location: dict | None = None
    is_verified: bool = Field(default=False)


class MealUpdate(BaseModel):
    """Update meal request schema."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] | None = None
    timestamp: datetime | None = None
    calories: int | None = Field(default=None, ge=0)
    protein: Decimal | None = Field(default=None, ge=0)
    carbs: Decimal | None = Field(default=None, ge=0)
    fat: Decimal | None = Field(default=None, ge=0)
    fiber: Decimal | None = Field(default=None, ge=0)
    sugar: Decimal | None = Field(default=None, ge=0)
    sodium: Decimal | None = Field(default=None, ge=0)
    water: Decimal | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=1000)
    location_name: str | None = Field(default=None, max_length=255)
    restaurant_name: str | None = Field(default=None, max_length=255)
    is_verified: bool | None = None


class MealResponse(MealBase, MealNutrition):
    """Meal response schema."""

    id: UUID
    user_id: UUID
    is_verified: bool
    location: dict | None
    created_at: datetime
    updated_at: datetime
    photos: list[MealPhotoResponse] = Field(default_factory=list)
    ingredients: list[MealIngredientResponse] = Field(default_factory=list)
    ai_analysis: AIAnalysisResponse | None = None


class MealListResponse(BaseModel):
    """Meal list response schema."""

    id: UUID
    name: str
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    timestamp: datetime
    calories: int | None
    is_verified: bool
    thumbnail_url: str | None
    created_at: datetime


class DailySummaryResponse(BaseModel):
    """Daily summary response schema."""

    date: datetime
    total_calories: int
    total_protein: Decimal
    total_carbs: Decimal
    total_fat: Decimal
    total_fiber: Decimal
    total_sugar: Decimal
    total_sodium: Decimal
    total_water: Decimal
    breakfast_count: int
    lunch_count: int
    dinner_count: int
    snack_count: int
    total_meals: int
    average_health_score: int | None
    goals_met: bool


class PhotoUploadResponse(BaseModel):
    """Photo upload response schema."""

    photo_url: str
    thumbnail_url: str | None
    width: int
    height: int
    file_size: int
    mime_type: str
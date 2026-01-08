"""Meal router."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, File, Query, UploadFile, status

from src.auth.dependencies import DbSession, VerifiedUser
from src.meals.schemas import (
    DailySummaryResponse,
    MealCreate,
    MealListResponse,
    MealResponse,
    MealUpdate,
    PhotoUploadResponse,
)
from src.meals.service import MealService
from src.pagination import PaginatedResponse, PaginationParams

router = APIRouter(prefix="/meals", tags=["Meals"])
meal_service = MealService()


@router.post(
    "",
    response_model=MealResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new meal",
)
async def create_meal(
    meal_data: MealCreate,
    user: VerifiedUser,
    session: DbSession,
    background_tasks: BackgroundTasks,
) -> MealResponse:
    """Create a new meal entry."""
    meal = await meal_service.create_meal(session, user.id, meal_data)
    
    # Trigger AI analysis in background if photos provided
    if meal_data.photos:
        # background_tasks.add_task(analyze_meal_photos, meal.id, meal_data.photos)
        pass
    
    return MealResponse(
        id=meal.id,
        user_id=meal.user_id,
        name=meal.name,
        meal_type=meal.meal_type,
        timestamp=meal.timestamp,
        calories=meal.calories,
        protein=meal.protein,
        carbs=meal.carbs,
        fat=meal.fat,
        fiber=meal.fiber,
        sugar=meal.sugar,
        sodium=meal.sodium,
        water=meal.water,
        notes=meal.notes,
        location=meal.location,
        location_name=meal.location_name,
        restaurant_name=meal.restaurant_name,
        is_verified=meal.is_verified,
        created_at=meal.created_at,
        updated_at=meal.updated_at,
        photos=[
            {
                "id": photo.id,
                "photo_url": photo.photo_url,
                "thumbnail_url": photo.thumbnail_url,
                "width": photo.width,
                "height": photo.height,
                "file_size": photo.file_size,
                "mime_type": photo.mime_type,
                "display_order": photo.display_order,
                "created_at": photo.created_at,
            }
            for photo in meal.photos
        ],
        ingredients=[
            {
                "id": ingredient.id,
                "ingredient_name": ingredient.ingredient_name,
                "quantity": ingredient.quantity,
                "unit": ingredient.unit,
                "calories_per_serving": ingredient.calories_per_serving,
                "display_order": ingredient.display_order,
                "created_at": ingredient.created_at,
            }
            for ingredient in meal.ingredients
        ],
        ai_analysis=(
            {
                "id": meal.ai_analysis.id,
                "detected_items": meal.ai_analysis.detected_items,
                "confidence": meal.ai_analysis.confidence,
                "estimated_calories": meal.ai_analysis.estimated_calories,
                "suggested_meal_type": meal.ai_analysis.suggested_meal_type,
                "cuisine_type": meal.ai_analysis.cuisine_type,
                "health_score": meal.ai_analysis.health_score,
                "nutrition_balance": meal.ai_analysis.nutrition_balance,
                "recommendations": meal.ai_analysis.recommendations,
                "warnings": meal.ai_analysis.warnings,
                "ai_model_version": meal.ai_analysis.ai_model_version,
                "processing_time_ms": meal.ai_analysis.processing_time_ms,
                "created_at": meal.ai_analysis.created_at,
            }
            if meal.ai_analysis
            else None
        ),
    )


@router.get(
    "",
    response_model=list[MealListResponse],
    summary="Get user meals",
)
async def get_meals(
    user: VerifiedUser,
    session: DbSession,
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> list[MealListResponse]:
    """Get user's meals with optional filters."""
    offset = (page - 1) * page_size
    
    meals = await meal_service.get_user_meals(
        session,
        user.id,
        meal_type=meal_type,
        start_date=start_date,
        end_date=end_date,
        limit=page_size,
        offset=offset,
    )
    
    return [
        MealListResponse(
            id=meal.id,
            name=meal.name,
            meal_type=meal.meal_type,
            timestamp=meal.timestamp,
            calories=meal.calories,
            is_verified=meal.is_verified,
            thumbnail_url=meal.photos[0].thumbnail_url if meal.photos else None,
            created_at=meal.created_at,
        )
        for meal in meals
    ]


@router.get(
    "/daily-summary",
    response_model=DailySummaryResponse,
    summary="Get daily summary",
)
async def get_daily_summary(
    user: VerifiedUser,
    session: DbSession,
    target_date: date = Query(default=None, description="Date for summary (defaults to today)"),
) -> DailySummaryResponse:
    """Get daily nutrition summary for a user."""
    if not target_date:
        target_date = date.today()
    
    summary = await meal_service.get_daily_summary(session, user.id, target_date)
    
    return DailySummaryResponse(**summary)


@router.get(
    "/{meal_id}",
    response_model=MealResponse,
    summary="Get meal by ID",
)
async def get_meal(
    meal_id: UUID,
    user: VerifiedUser,
    session: DbSession,
) -> MealResponse:
    """Get a specific meal by ID."""
    meal = await meal_service.get_meal(session, meal_id, user.id)
    
    return MealResponse(
        id=meal.id,
        user_id=meal.user_id,
        name=meal.name,
        meal_type=meal.meal_type,
        timestamp=meal.timestamp,
        calories=meal.calories,
        protein=meal.protein,
        carbs=meal.carbs,
        fat=meal.fat,
        fiber=meal.fiber,
        sugar=meal.sugar,
        sodium=meal.sodium,
        water=meal.water,
        notes=meal.notes,
        location=meal.location,
        location_name=meal.location_name,
        restaurant_name=meal.restaurant_name,
        is_verified=meal.is_verified,
        created_at=meal.created_at,
        updated_at=meal.updated_at,
        photos=[
            {
                "id": photo.id,
                "photo_url": photo.photo_url,
                "thumbnail_url": photo.thumbnail_url,
                "width": photo.width,
                "height": photo.height,
                "file_size": photo.file_size,
                "mime_type": photo.mime_type,
                "display_order": photo.display_order,
                "created_at": photo.created_at,
            }
            for photo in meal.photos
        ],
        ingredients=[
            {
                "id": ingredient.id,
                "ingredient_name": ingredient.ingredient_name,
                "quantity": ingredient.quantity,
                "unit": ingredient.unit,
                "calories_per_serving": ingredient.calories_per_serving,
                "display_order": ingredient.display_order,
                "created_at": ingredient.created_at,
            }
            for ingredient in meal.ingredients
        ],
        ai_analysis=(
            {
                "id": meal.ai_analysis.id,
                "detected_items": meal.ai_analysis.detected_items,
                "confidence": meal.ai_analysis.confidence,
                "estimated_calories": meal.ai_analysis.estimated_calories,
                "suggested_meal_type": meal.ai_analysis.suggested_meal_type,
                "cuisine_type": meal.ai_analysis.cuisine_type,
                "health_score": meal.ai_analysis.health_score,
                "nutrition_balance": meal.ai_analysis.nutrition_balance,
                "recommendations": meal.ai_analysis.recommendations,
                "warnings": meal.ai_analysis.warnings,
                "ai_model_version": meal.ai_analysis.ai_model_version,
                "processing_time_ms": meal.ai_analysis.processing_time_ms,
                "created_at": meal.ai_analysis.created_at,
            }
            if meal.ai_analysis
            else None
        ),
    )


@router.put(
    "/{meal_id}",
    response_model=MealResponse,
    summary="Update meal",
)
async def update_meal(
    meal_id: UUID,
    meal_update: MealUpdate,
    user: VerifiedUser,
    session: DbSession,
) -> MealResponse:
    """Update a meal entry."""
    meal = await meal_service.update_meal(session, meal_id, user.id, meal_update)
    
    return MealResponse(
        id=meal.id,
        user_id=meal.user_id,
        name=meal.name,
        meal_type=meal.meal_type,
        timestamp=meal.timestamp,
        calories=meal.calories,
        protein=meal.protein,
        carbs=meal.carbs,
        fat=meal.fat,
        fiber=meal.fiber,
        sugar=meal.sugar,
        sodium=meal.sodium,
        water=meal.water,
        notes=meal.notes,
        location=meal.location,
        location_name=meal.location_name,
        restaurant_name=meal.restaurant_name,
        is_verified=meal.is_verified,
        created_at=meal.created_at,
        updated_at=meal.updated_at,
        photos=[
            {
                "id": photo.id,
                "photo_url": photo.photo_url,
                "thumbnail_url": photo.thumbnail_url,
                "width": photo.width,
                "height": photo.height,
                "file_size": photo.file_size,
                "mime_type": photo.mime_type,
                "display_order": photo.display_order,
                "created_at": photo.created_at,
            }
            for photo in meal.photos
        ],
        ingredients=[
            {
                "id": ingredient.id,
                "ingredient_name": ingredient.ingredient_name,
                "quantity": ingredient.quantity,
                "unit": ingredient.unit,
                "calories_per_serving": ingredient.calories_per_serving,
                "display_order": ingredient.display_order,
                "created_at": ingredient.created_at,
            }
            for ingredient in meal.ingredients
        ],
        ai_analysis=(
            {
                "id": meal.ai_analysis.id,
                "detected_items": meal.ai_analysis.detected_items,
                "confidence": meal.ai_analysis.confidence,
                "estimated_calories": meal.ai_analysis.estimated_calories,
                "suggested_meal_type": meal.ai_analysis.suggested_meal_type,
                "cuisine_type": meal.ai_analysis.cuisine_type,
                "health_score": meal.ai_analysis.health_score,
                "nutrition_balance": meal.ai_analysis.nutrition_balance,
                "recommendations": meal.ai_analysis.recommendations,
                "warnings": meal.ai_analysis.warnings,
                "ai_model_version": meal.ai_analysis.ai_model_version,
                "processing_time_ms": meal.ai_analysis.processing_time_ms,
                "created_at": meal.ai_analysis.created_at,
            }
            if meal.ai_analysis
            else None
        ),
    )


@router.delete(
    "/{meal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete meal",
)
async def delete_meal(
    meal_id: UUID,
    user: VerifiedUser,
    session: DbSession,
) -> None:
    """Delete a meal entry."""
    await meal_service.delete_meal(session, meal_id, user.id)


@router.post(
    "/{meal_id}/photos",
    response_model=PhotoUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload meal photo",
)
async def upload_meal_photo(
    meal_id: UUID,
    user: VerifiedUser,
    session: DbSession,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
) -> PhotoUploadResponse:
    """Upload a photo for a meal."""
    # TODO: Implement actual file upload to S3
    # For now, return mock data
    
    photo_data = {
        "photo_url": f"https://storage.example.com/meals/{meal_id}/{file.filename}",
        "thumbnail_url": f"https://storage.example.com/meals/{meal_id}/thumb_{file.filename}",
        "width": 1920,
        "height": 1080,
        "file_size": file.size or 0,
        "mime_type": file.content_type,
    }
    
    photo = await meal_service.add_photo_to_meal(session, meal_id, user.id, photo_data)
    
    # Trigger AI analysis in background
    # background_tasks.add_task(analyze_meal_photo, meal_id, photo.id)
    
    return PhotoUploadResponse(
        photo_url=photo.photo_url,
        thumbnail_url=photo.thumbnail_url,
        width=photo.width or 0,
        height=photo.height or 0,
        file_size=photo.file_size or 0,
        mime_type=photo.mime_type or "image/jpeg",
    )


@router.delete(
    "/{meal_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete meal photo",
)
async def delete_meal_photo(
    meal_id: UUID,
    photo_id: UUID,
    user: VerifiedUser,
    session: DbSession,
) -> None:
    """Delete a photo from a meal."""
    await meal_service.delete_photo_from_meal(session, meal_id, photo_id, user.id)
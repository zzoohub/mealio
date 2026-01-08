"""Meal service layer."""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from src.exceptions import ForbiddenError, NotFoundError
from src.meals.models import AIAnalysis, Meal, MealIngredient, MealPhoto
from src.meals.schemas import MealCreate, MealUpdate


class MealService:
    """Meal service for business logic."""

    async def create_meal(
        self,
        session: AsyncSession,
        user_id: UUID,
        meal_data: MealCreate,
    ) -> Meal:
        """Create a new meal."""
        # Create meal
        meal = Meal(
            user_id=user_id,
            name=meal_data.name,
            meal_type=meal_data.meal_type,
            timestamp=meal_data.timestamp,
            calories=meal_data.calories,
            protein=meal_data.protein,
            carbs=meal_data.carbs,
            fat=meal_data.fat,
            fiber=meal_data.fiber,
            sugar=meal_data.sugar,
            sodium=meal_data.sodium,
            water=meal_data.water,
            notes=meal_data.notes,
            location=meal_data.location,
            location_name=meal_data.location_name,
            restaurant_name=meal_data.restaurant_name,
            is_verified=meal_data.is_verified,
        )
        session.add(meal)
        
        # Add ingredients
        for idx, ingredient_data in enumerate(meal_data.ingredients):
            ingredient = MealIngredient(
                meal_id=meal.id,
                ingredient_name=ingredient_data.ingredient_name,
                quantity=ingredient_data.quantity,
                unit=ingredient_data.unit,
                calories_per_serving=ingredient_data.calories_per_serving,
                display_order=ingredient_data.display_order or idx,
            )
            session.add(ingredient)
        
        # Add photos
        for idx, photo_data in enumerate(meal_data.photos):
            photo = MealPhoto(
                meal_id=meal.id,
                photo_url=photo_data.photo_url,
                thumbnail_url=photo_data.thumbnail_url,
                width=photo_data.width,
                height=photo_data.height,
                file_size=photo_data.file_size,
                mime_type=photo_data.mime_type,
                display_order=photo_data.display_order or idx,
            )
            session.add(photo)
        
        await session.commit()
        await session.refresh(meal)
        
        # Load relationships
        result = await session.exec(
            select(Meal)
            .options(
                selectinload(Meal.photos),
                selectinload(Meal.ingredients),
                selectinload(Meal.ai_analysis),
            )
            .where(Meal.id == meal.id)
        )
        return result.first()

    async def get_meal(
        self,
        session: AsyncSession,
        meal_id: UUID,
        user_id: UUID | None = None,
    ) -> Meal:
        """Get a meal by ID with optimized relationship loading."""
        includes = [Meal.photos, Meal.ingredients, Meal.ai_analysis]
        
        if user_id is None:
            # Get meal by ID with relationships, checking for soft delete
            query = (
                select(Meal)
                .options(selectinload(include) for include in includes)
                .where(Meal.id == meal_id)
                .where(Meal.deleted_at.is_(None))
            )
            result = await session.exec(query)
            meal = result.first()
            
            if not meal:
                raise NotFoundError("Meal not found")
                
            return meal
        else:
            # Get meal owned by specific user
            query = (
                select(Meal)
                .options(selectinload(include) for include in includes)
                .where(Meal.id == meal_id)
                .where(Meal.user_id == user_id)
                .where(Meal.deleted_at.is_(None))
            )
            result = await session.exec(query)
            meal = result.first()
            
            if not meal:
                raise NotFoundError("Meal not found or not owned by user")
                
            return meal

    async def update_meal(
        self,
        session: AsyncSession,
        meal_id: UUID,
        user_id: UUID,
        meal_update: MealUpdate,
    ) -> Meal:
        """Update a meal."""
        meal = await self.get_meal(session, meal_id, user_id)
        
        # Update fields
        update_data = meal_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(meal, field, value)
        
        await session.commit()
        await session.refresh(meal)
        
        # Reload with relationships
        return await self.get_meal(session, meal_id, user_id)

    async def delete_meal(
        self,
        session: AsyncSession,
        meal_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Soft delete a meal."""
        meal = await self.get_meal(session, meal_id, user_id)
        
        meal.deleted_at = datetime.now(timezone.utc)
        await session.commit()
        
        return True

    async def get_user_meals(
        self,
        session: AsyncSession,
        user_id: UUID,
        meal_type: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Meal]:
        """Get meals for a user with filters."""
        query = (
            select(Meal)
            .options(
                selectinload(Meal.photos),
                selectinload(Meal.ingredients),
                selectinload(Meal.ai_analysis),
            )
            .where(Meal.user_id == user_id)
            .where(Meal.deleted_at.is_(None))
        )
        
        if meal_type:
            query = query.where(Meal.meal_type == meal_type)
        
        if start_date:
            query = query.where(Meal.timestamp >= start_date)
        
        if end_date:
            query = query.where(Meal.timestamp <= end_date)
        
        query = query.order_by(Meal.timestamp.desc()).offset(offset).limit(limit)
        
        result = await session.exec(query)
        return result.all()

    async def get_daily_summary(
        self,
        session: AsyncSession,
        user_id: UUID,
        target_date: date,
    ) -> dict[str, Any]:
        """Get daily summary for a user."""
        start_datetime = datetime.combine(target_date, datetime.min.time()).replace(
            tzinfo=timezone.utc
        )
        end_datetime = datetime.combine(target_date, datetime.max.time()).replace(
            tzinfo=timezone.utc
        )
        
        # Get all meals for the day
        result = await session.exec(
            select(Meal)
            .options(selectinload(Meal.ai_analysis))
            .where(Meal.user_id == user_id)
            .where(Meal.deleted_at.is_(None))
            .where(Meal.timestamp >= start_datetime)
            .where(Meal.timestamp <= end_datetime)
        )
        meals = result.all()
        
        # Calculate totals
        summary = {
            "date": target_date,
            "total_calories": 0,
            "total_protein": Decimal(0),
            "total_carbs": Decimal(0),
            "total_fat": Decimal(0),
            "total_fiber": Decimal(0),
            "total_sugar": Decimal(0),
            "total_sodium": Decimal(0),
            "total_water": Decimal(0),
            "breakfast_count": 0,
            "lunch_count": 0,
            "dinner_count": 0,
            "snack_count": 0,
            "total_meals": len(meals),
            "average_health_score": None,
            "goals_met": False,
        }
        
        health_scores = []
        
        for meal in meals:
            # Add nutrition values
            if meal.calories:
                summary["total_calories"] += meal.calories
            if meal.protein:
                summary["total_protein"] += meal.protein
            if meal.carbs:
                summary["total_carbs"] += meal.carbs
            if meal.fat:
                summary["total_fat"] += meal.fat
            if meal.fiber:
                summary["total_fiber"] += meal.fiber
            if meal.sugar:
                summary["total_sugar"] += meal.sugar
            if meal.sodium:
                summary["total_sodium"] += meal.sodium
            if meal.water:
                summary["total_water"] += meal.water
            
            # Count meal types
            if meal.meal_type == "breakfast":
                summary["breakfast_count"] += 1
            elif meal.meal_type == "lunch":
                summary["lunch_count"] += 1
            elif meal.meal_type == "dinner":
                summary["dinner_count"] += 1
            elif meal.meal_type == "snack":
                summary["snack_count"] += 1
            
            # Collect health scores
            if meal.ai_analysis and meal.ai_analysis.health_score:
                health_scores.append(meal.ai_analysis.health_score)
        
        # Calculate average health score
        if health_scores:
            summary["average_health_score"] = sum(health_scores) // len(health_scores)
        
        # TODO: Check if goals are met based on user goals
        
        return summary

    async def add_photo_to_meal(
        self,
        session: AsyncSession,
        meal_id: UUID,
        user_id: UUID,
        photo_data: dict,
    ) -> MealPhoto:
        """Add a photo to a meal."""
        # Verify meal ownership
        meal = await self.get_meal(session, meal_id, user_id)
        
        # Get max display order
        result = await session.exec(
            select(func.max(MealPhoto.display_order))
            .where(MealPhoto.meal_id == meal_id)
        )
        max_order = result.first() or 0
        
        # Create photo
        photo = MealPhoto(
            meal_id=meal_id,
            photo_url=photo_data["photo_url"],
            thumbnail_url=photo_data.get("thumbnail_url"),
            width=photo_data.get("width"),
            height=photo_data.get("height"),
            file_size=photo_data.get("file_size"),
            mime_type=photo_data.get("mime_type"),
            display_order=max_order + 1,
        )
        session.add(photo)
        await session.commit()
        await session.refresh(photo)
        
        return photo

    async def delete_photo_from_meal(
        self,
        session: AsyncSession,
        meal_id: UUID,
        photo_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Delete a photo from a meal."""
        # Verify meal ownership
        meal = await self.get_meal(session, meal_id, user_id)
        
        # Get photo
        result = await session.exec(
            select(MealPhoto)
            .where(MealPhoto.id == photo_id)
            .where(MealPhoto.meal_id == meal_id)
        )
        photo = result.first()
        
        if not photo:
            raise NotFoundError("Photo", photo_id)
        
        await session.delete(photo)
        await session.commit()
        
        return True

    async def save_ai_analysis(
        self,
        session: AsyncSession,
        meal_id: UUID,
        analysis_data: dict,
    ) -> AIAnalysis:
        """Save AI analysis results for a meal."""
        # Check if analysis already exists
        result = await session.exec(
            select(AIAnalysis).where(AIAnalysis.meal_id == meal_id)
        )
        existing_analysis = result.first()
        
        if existing_analysis:
            # Update existing analysis
            for key, value in analysis_data.items():
                setattr(existing_analysis, key, value)
            await session.commit()
            await session.refresh(existing_analysis)
            return existing_analysis
        
        # Create new analysis
        analysis = AIAnalysis(
            meal_id=meal_id,
            **analysis_data,
        )
        session.add(analysis)
        await session.commit()
        await session.refresh(analysis)
        
        return analysis
use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct UserNutrition {
    pub id: i64,
    pub entry_id: i64,
    #[schema(value_type = Option<f64>)]
    pub calories: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub protein_grams: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub fat_grams: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub carbs_grams: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub fiber_grams: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub sugar_grams: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub sodium_mg: Option<BigDecimal>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpsertNutritionRequest {
    #[schema(value_type = Option<f64>)]
    pub calories: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub protein_grams: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub fat_grams: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub carbs_grams: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub fiber_grams: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub sugar_grams: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub sodium_mg: Option<BigDecimal>,
}

impl UserNutrition {
    pub async fn find_by_entry_id(db: &PgPool, entry_id: i64) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, UserNutrition>(
            "SELECT id, entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, created_at, updated_at
             FROM user_nutrition WHERE entry_id = $1",
        )
        .bind(entry_id)
        .fetch_optional(db)
        .await
    }

    pub async fn upsert(
        db: &PgPool,
        entry_id: i64,
        req: &UpsertNutritionRequest,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, UserNutrition>(
            "INSERT INTO user_nutrition (entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (entry_id)
             DO UPDATE SET calories = $2, protein_grams = $3, fat_grams = $4, carbs_grams = $5, fiber_grams = $6, sugar_grams = $7, sodium_mg = $8
             RETURNING id, entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, created_at, updated_at",
        )
        .bind(entry_id)
        .bind(&req.calories)
        .bind(&req.protein_grams)
        .bind(&req.fat_grams)
        .bind(&req.carbs_grams)
        .bind(&req.fiber_grams)
        .bind(&req.sugar_grams)
        .bind(&req.sodium_mg)
        .fetch_one(db)
        .await
    }

    pub async fn delete_by_entry_id(db: &PgPool, entry_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM user_nutrition WHERE entry_id = $1")
            .bind(entry_id)
            .execute(db)
            .await?;
        Ok(())
    }
}

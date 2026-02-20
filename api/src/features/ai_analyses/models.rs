use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct AiAnalysis {
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
    pub description: Option<String>,
    #[schema(value_type = Option<f64>)]
    pub confidence_score: Option<BigDecimal>,
    pub raw_response: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateAnalysisRequest {
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
    pub description: Option<String>,
    #[schema(value_type = Option<f64>)]
    pub confidence_score: Option<BigDecimal>,
    pub raw_response: Option<serde_json::Value>,
}

impl AiAnalysis {
    pub async fn find_by_entry_id(db: &PgPool, entry_id: i64) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as!(
            AiAnalysis,
            "SELECT id, entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response, created_at, status, error_message
             FROM ai_analyses WHERE entry_id = $1 ORDER BY created_at DESC LIMIT 1",
            entry_id,
        )
        .fetch_optional(db)
        .await
    }

    pub async fn create(db: &PgPool, entry_id: i64, req: &CreateAnalysisRequest) -> Result<Self, sqlx::Error> {
        sqlx::query_as!(
            AiAnalysis,
            "INSERT INTO ai_analyses (entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed')
             RETURNING id, entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response, created_at, status, error_message",
            entry_id,
            req.calories.as_ref() as Option<&BigDecimal>,
            req.protein_grams.as_ref() as Option<&BigDecimal>,
            req.fat_grams.as_ref() as Option<&BigDecimal>,
            req.carbs_grams.as_ref() as Option<&BigDecimal>,
            req.fiber_grams.as_ref() as Option<&BigDecimal>,
            req.sugar_grams.as_ref() as Option<&BigDecimal>,
            req.sodium_mg.as_ref() as Option<&BigDecimal>,
            req.description.as_deref(),
            req.confidence_score.as_ref() as Option<&BigDecimal>,
            req.raw_response.as_ref() as Option<&serde_json::Value>,
        )
        .fetch_one(db)
        .await
    }

    pub async fn create_pending(db: &PgPool, entry_id: i64) -> Result<Self, sqlx::Error> {
        sqlx::query_as!(
            AiAnalysis,
            "INSERT INTO ai_analyses (entry_id, status)
             VALUES ($1, 'pending')
             RETURNING id, entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response, created_at, status, error_message",
            entry_id,
        )
        .fetch_one(db)
        .await
    }

    pub async fn mark_processing(db: &PgPool, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query!(
            "UPDATE ai_analyses SET status = 'processing' WHERE id = $1",
            id,
        )
        .execute(db)
        .await?;
        Ok(())
    }

    pub async fn mark_completed(
        db: &PgPool,
        id: i64,
        calories: Option<&BigDecimal>,
        protein_grams: Option<&BigDecimal>,
        fat_grams: Option<&BigDecimal>,
        carbs_grams: Option<&BigDecimal>,
        fiber_grams: Option<&BigDecimal>,
        sugar_grams: Option<&BigDecimal>,
        sodium_mg: Option<&BigDecimal>,
        description: Option<&str>,
        confidence_score: Option<&BigDecimal>,
        raw_response: Option<&serde_json::Value>,
    ) -> Result<u64, sqlx::Error> {
        let result = sqlx::query!(
            "UPDATE ai_analyses
             SET status = 'completed',
                 calories = $2, protein_grams = $3, fat_grams = $4, carbs_grams = $5,
                 fiber_grams = $6, sugar_grams = $7, sodium_mg = $8,
                 description = $9, confidence_score = $10, raw_response = $11
             WHERE id = $1",
            id,
            calories,
            protein_grams,
            fat_grams,
            carbs_grams,
            fiber_grams,
            sugar_grams,
            sodium_mg,
            description,
            confidence_score,
            raw_response,
        )
        .execute(db)
        .await?;
        Ok(result.rows_affected())
    }

    pub async fn mark_failed(db: &PgPool, id: i64, error_message: &str) -> Result<(), sqlx::Error> {
        sqlx::query!(
            "UPDATE ai_analyses SET status = 'failed', error_message = $2 WHERE id = $1",
            id,
            error_message,
        )
        .execute(db)
        .await?;
        Ok(())
    }

    pub async fn delete_by_id(db: &PgPool, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query!("DELETE FROM ai_analyses WHERE id = $1", id)
            .execute(db)
            .await?;
        Ok(())
    }

    /// Find analyses stuck in pending/processing for more than `minutes` minutes.
    pub async fn find_stuck(db: &PgPool, minutes: i32) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_as!(
            AiAnalysis,
            "SELECT id, entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response, created_at, status, error_message
             FROM ai_analyses
             WHERE status IN ('pending', 'processing')
               AND created_at < now() - make_interval(mins := $1)
             ORDER BY created_at",
            minutes,
        )
        .fetch_all(db)
        .await
    }
}

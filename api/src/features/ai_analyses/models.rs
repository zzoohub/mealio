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
            "SELECT id, entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response, created_at
             FROM ai_analyses WHERE entry_id = $1 ORDER BY created_at DESC LIMIT 1",
            entry_id,
        )
        .fetch_optional(db)
        .await
    }

    pub async fn create(db: &PgPool, entry_id: i64, req: &CreateAnalysisRequest) -> Result<Self, sqlx::Error> {
        sqlx::query_as!(
            AiAnalysis,
            "INSERT INTO ai_analyses (entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response, created_at",
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
}

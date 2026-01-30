use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AiAnalysis {
    pub id: i64,
    pub entry_id: i64,
    pub calories: Option<BigDecimal>,
    pub protein_grams: Option<BigDecimal>,
    pub fat_grams: Option<BigDecimal>,
    pub carbs_grams: Option<BigDecimal>,
    pub fiber_grams: Option<BigDecimal>,
    pub sugar_grams: Option<BigDecimal>,
    pub sodium_mg: Option<BigDecimal>,
    pub description: Option<String>,
    pub confidence_score: Option<BigDecimal>,
    pub raw_response: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAnalysisRequest {
    pub calories: Option<BigDecimal>,
    pub protein_grams: Option<BigDecimal>,
    pub fat_grams: Option<BigDecimal>,
    pub carbs_grams: Option<BigDecimal>,
    pub fiber_grams: Option<BigDecimal>,
    pub sugar_grams: Option<BigDecimal>,
    pub sodium_mg: Option<BigDecimal>,
    pub description: Option<String>,
    pub confidence_score: Option<BigDecimal>,
    pub raw_response: Option<serde_json::Value>,
}

impl AiAnalysis {
    pub async fn find_by_entry_id(db: &PgPool, entry_id: i64) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, AiAnalysis>(
            "SELECT id, entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response, created_at
             FROM ai_analyses WHERE entry_id = $1 ORDER BY created_at DESC LIMIT 1",
        )
        .bind(entry_id)
        .fetch_optional(db)
        .await
    }

    pub async fn create(db: &PgPool, entry_id: i64, req: &CreateAnalysisRequest) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, AiAnalysis>(
            "INSERT INTO ai_analyses (entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, entry_id, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, sugar_grams, sodium_mg, description, confidence_score, raw_response, created_at",
        )
        .bind(entry_id)
        .bind(&req.calories)
        .bind(&req.protein_grams)
        .bind(&req.fat_grams)
        .bind(&req.carbs_grams)
        .bind(&req.fiber_grams)
        .bind(&req.sugar_grams)
        .bind(&req.sodium_mg)
        .bind(&req.description)
        .bind(&req.confidence_score)
        .bind(&req.raw_response)
        .fetch_one(db)
        .await
    }
}

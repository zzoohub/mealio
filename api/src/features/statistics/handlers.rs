use axum::extract::Query;
use bigdecimal::BigDecimal;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::response;
use crate::shared::types::MealType;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct StatsParams {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct NutritionStats {
    pub total_entries: i64,
    #[schema(value_type = Option<f64>)]
    pub avg_calories: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub total_calories: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub avg_protein: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub total_protein: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub avg_fat: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub total_fat: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub avg_sugar: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub total_sugar: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub avg_carbs: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub total_carbs: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub avg_fiber: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub total_fiber: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub avg_sodium: Option<BigDecimal>,
    #[schema(value_type = Option<f64>)]
    pub total_sodium: Option<BigDecimal>,
}

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct MealTypeCount {
    pub meal_type: MealType,
    pub count: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct TopIngredient {
    pub ingredient_id: i64,
    pub ingredient_name: String,
    pub usage_count: i64,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct Overview {
    pub nutrition: NutritionStats,
    pub meal_types: Vec<MealTypeCount>,
    pub top_ingredients: Vec<TopIngredient>,
}

#[utoipa::path(
    get,
    path = "/api/v1/statistics/nutrition",
    params(StatsParams),
    responses(
        (status = 200, description = "Nutrition statistics", body = NutritionStats),
    ),
    security(("bearer_auth" = [])),
    tag = "Statistics"
)]
pub async fn nutrition_stats(
    auth: AuthUser,
    Db(db): Db,
    Query(params): Query<StatsParams>,
) -> Result<response::Ok<NutritionStats>, AppError> {
    let stats = fetch_nutrition_stats(&db, auth.user_id, &params).await?;
    Ok(response::Ok(stats))
}

#[utoipa::path(
    get,
    path = "/api/v1/statistics/meal-types",
    params(StatsParams),
    responses(
        (status = 200, description = "Meal type counts", body = Vec<MealTypeCount>),
    ),
    security(("bearer_auth" = [])),
    tag = "Statistics"
)]
pub async fn meal_type_stats(
    auth: AuthUser,
    Db(db): Db,
    Query(params): Query<StatsParams>,
) -> Result<response::Ok<Vec<MealTypeCount>>, AppError> {
    let counts = fetch_meal_type_counts(&db, auth.user_id, &params).await?;
    Ok(response::Ok(counts))
}

#[utoipa::path(
    get,
    path = "/api/v1/statistics/top-ingredients",
    params(StatsParams),
    responses(
        (status = 200, description = "Top 20 ingredients", body = Vec<TopIngredient>),
    ),
    security(("bearer_auth" = [])),
    tag = "Statistics"
)]
pub async fn top_ingredients(
    auth: AuthUser,
    Db(db): Db,
    Query(params): Query<StatsParams>,
) -> Result<response::Ok<Vec<TopIngredient>>, AppError> {
    let ingredients = fetch_top_ingredients(&db, auth.user_id, &params).await?;
    Ok(response::Ok(ingredients))
}

#[utoipa::path(
    get,
    path = "/api/v1/statistics/overview",
    params(StatsParams),
    responses(
        (status = 200, description = "Statistics overview", body = Overview),
    ),
    security(("bearer_auth" = [])),
    tag = "Statistics"
)]
pub async fn overview(
    auth: AuthUser,
    Db(db): Db,
    Query(params): Query<StatsParams>,
) -> Result<response::Ok<Overview>, AppError> {
    let nutrition = fetch_nutrition_stats(&db, auth.user_id, &params).await?;
    let meal_types = fetch_meal_type_counts(&db, auth.user_id, &params).await?;
    let top = fetch_top_ingredients(&db, auth.user_id, &params).await?;

    Ok(response::Ok(Overview {
        nutrition,
        meal_types,
        top_ingredients: top,
    }))
}

#[derive(sqlx::FromRow)]
struct NutritionStatsRow {
    total_entries: i64,
    avg_calories: Option<BigDecimal>,
    total_calories: Option<BigDecimal>,
    avg_protein: Option<BigDecimal>,
    total_protein: Option<BigDecimal>,
    avg_fat: Option<BigDecimal>,
    total_fat: Option<BigDecimal>,
    avg_sugar: Option<BigDecimal>,
    total_sugar: Option<BigDecimal>,
    avg_carbs: Option<BigDecimal>,
    total_carbs: Option<BigDecimal>,
    avg_fiber: Option<BigDecimal>,
    total_fiber: Option<BigDecimal>,
    avg_sodium: Option<BigDecimal>,
    total_sodium: Option<BigDecimal>,
}

async fn fetch_nutrition_stats(
    db: &sqlx::PgPool,
    user_id: i64,
    params: &StatsParams,
) -> Result<NutritionStats, AppError> {
    let row = sqlx::query_as::<_, NutritionStatsRow>(
        "SELECT
            COUNT(de.id) as total_entries,
            AVG(un.calories) as avg_calories,
            SUM(un.calories) as total_calories,
            AVG(un.protein_grams) as avg_protein,
            SUM(un.protein_grams) as total_protein,
            AVG(un.fat_grams) as avg_fat,
            SUM(un.fat_grams) as total_fat,
            AVG(un.sugar_grams) as avg_sugar,
            SUM(un.sugar_grams) as total_sugar,
            AVG(un.carbs_grams) as avg_carbs,
            SUM(un.carbs_grams) as total_carbs,
            AVG(un.fiber_grams) as avg_fiber,
            SUM(un.fiber_grams) as total_fiber,
            AVG(un.sodium_mg) as avg_sodium,
            SUM(un.sodium_mg) as total_sodium
        FROM diary_entries de
        LEFT JOIN user_nutrition un ON un.entry_id = de.id
        WHERE de.user_id = $1 AND de.deleted_at IS NULL
        AND ($2::date IS NULL OR de.eaten_at::date >= $2)
        AND ($3::date IS NULL OR de.eaten_at::date <= $3)",
    )
    .bind(user_id)
    .bind(params.start_date)
    .bind(params.end_date)
    .fetch_one(db)
    .await?;

    Ok(NutritionStats {
        total_entries: row.total_entries,
        avg_calories: row.avg_calories,
        total_calories: row.total_calories,
        avg_protein: row.avg_protein,
        total_protein: row.total_protein,
        avg_fat: row.avg_fat,
        total_fat: row.total_fat,
        avg_sugar: row.avg_sugar,
        total_sugar: row.total_sugar,
        avg_carbs: row.avg_carbs,
        total_carbs: row.total_carbs,
        avg_fiber: row.avg_fiber,
        total_fiber: row.total_fiber,
        avg_sodium: row.avg_sodium,
        total_sodium: row.total_sodium,
    })
}

async fn fetch_meal_type_counts(
    db: &sqlx::PgPool,
    user_id: i64,
    params: &StatsParams,
) -> Result<Vec<MealTypeCount>, AppError> {
    let rows = sqlx::query_as::<_, MealTypeCount>(
        "SELECT meal_type, COUNT(*) as count
         FROM diary_entries
         WHERE user_id = $1 AND deleted_at IS NULL
         AND ($2::date IS NULL OR eaten_at::date >= $2)
         AND ($3::date IS NULL OR eaten_at::date <= $3)
         GROUP BY meal_type
         ORDER BY count DESC",
    )
    .bind(user_id)
    .bind(params.start_date)
    .bind(params.end_date)
    .fetch_all(db)
    .await?;

    Ok(rows)
}

async fn fetch_top_ingredients(
    db: &sqlx::PgPool,
    user_id: i64,
    params: &StatsParams,
) -> Result<Vec<TopIngredient>, AppError> {
    let rows = sqlx::query_as::<_, TopIngredient>(
        "SELECT i.id as ingredient_id, i.name as ingredient_name, COUNT(*) as usage_count
         FROM entry_ingredients ei
         JOIN ingredients i ON i.id = ei.ingredient_id
         JOIN diary_entries de ON de.id = ei.entry_id
         WHERE de.user_id = $1 AND de.deleted_at IS NULL
         AND ($2::date IS NULL OR de.eaten_at::date >= $2)
         AND ($3::date IS NULL OR de.eaten_at::date <= $3)
         GROUP BY i.id, i.name
         ORDER BY usage_count DESC
         LIMIT 20",
    )
    .bind(user_id)
    .bind(params.start_date)
    .bind(params.end_date)
    .fetch_all(db)
    .await?;

    Ok(rows)
}

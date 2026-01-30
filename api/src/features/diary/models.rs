use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::shared::types::MealType;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct DiaryEntry {
    pub id: i64,
    pub user_id: i64,
    pub meal_type: MealType,
    pub title: String,
    pub notes: Option<String>,
    pub eaten_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct DiaryEntryDetail {
    #[serde(flatten)]
    pub entry: DiaryEntry,
    pub location: Option<EntryLocation>,
    pub photos: Vec<super::super::photos::models::EntryPhoto>,
    pub nutrition: Option<super::super::nutrition::models::UserNutrition>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEntryRequest {
    pub meal_type: MealType,
    pub title: String,
    pub notes: Option<String>,
    pub eaten_at: Option<DateTime<Utc>>,
    pub location: Option<CreateLocationInput>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLocationInput {
    pub name: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEntryRequest {
    pub meal_type: Option<MealType>,
    pub title: Option<String>,
    pub notes: Option<String>,
    pub eaten_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct DiaryQueryParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub meal_type: Option<MealType>,
    pub q: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct EntryLocation {
    pub id: i64,
    pub entry_id: i64,
    pub name: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub address: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertLocationRequest {
    pub name: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub address: Option<String>,
}

impl DiaryEntry {
    pub async fn verify_ownership(
        db: &PgPool,
        entry_id: i64,
        user_id: i64,
    ) -> Result<(), crate::error::AppError> {
        Self::find_by_id(db, entry_id, user_id)
            .await?
            .ok_or_else(|| crate::error::AppError::NotFound("diary entry not found".into()))?;
        Ok(())
    }

    pub async fn list(
        db: &PgPool,
        user_id: i64,
        params: &DiaryQueryParams,
    ) -> Result<(Vec<Self>, i64), sqlx::Error> {
        let page = params.page.unwrap_or(1).max(1);
        let per_page = params.per_page.unwrap_or(20).clamp(1, 100);
        let offset = (page - 1) * per_page;

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM diary_entries
             WHERE user_id = $1 AND deleted_at IS NULL
             AND ($2::date IS NULL OR eaten_at::date >= $2)
             AND ($3::date IS NULL OR eaten_at::date <= $3)
             AND ($4::meal_type IS NULL OR meal_type = $4)
             AND ($5::text IS NULL OR title ILIKE '%' || $5 || '%')",
        )
        .bind(user_id)
        .bind(params.start_date)
        .bind(params.end_date)
        .bind(&params.meal_type)
        .bind(&params.q)
        .fetch_one(db)
        .await?;

        let entries = sqlx::query_as::<_, DiaryEntry>(
            "SELECT id, user_id, meal_type, title, notes, eaten_at, created_at, updated_at
             FROM diary_entries
             WHERE user_id = $1 AND deleted_at IS NULL
             AND ($2::date IS NULL OR eaten_at::date >= $2)
             AND ($3::date IS NULL OR eaten_at::date <= $3)
             AND ($4::meal_type IS NULL OR meal_type = $4)
             AND ($5::text IS NULL OR title ILIKE '%' || $5 || '%')
             ORDER BY eaten_at DESC
             LIMIT $6 OFFSET $7",
        )
        .bind(user_id)
        .bind(params.start_date)
        .bind(params.end_date)
        .bind(&params.meal_type)
        .bind(&params.q)
        .bind(per_page)
        .bind(offset)
        .fetch_all(db)
        .await?;

        Ok((entries, count.0))
    }

    pub async fn find_by_id(db: &PgPool, id: i64, user_id: i64) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, DiaryEntry>(
            "SELECT id, user_id, meal_type, title, notes, eaten_at, created_at, updated_at
             FROM diary_entries WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(db)
        .await
    }

    pub async fn create(
        db: &PgPool,
        user_id: i64,
        meal_type: &MealType,
        title: &str,
        notes: Option<&str>,
        eaten_at: Option<DateTime<Utc>>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, DiaryEntry>(
            "INSERT INTO diary_entries (user_id, meal_type, title, notes, eaten_at)
             VALUES ($1, $2, $3, $4, COALESCE($5, now()))
             RETURNING id, user_id, meal_type, title, notes, eaten_at, created_at, updated_at",
        )
        .bind(user_id)
        .bind(meal_type)
        .bind(title)
        .bind(notes)
        .bind(eaten_at)
        .fetch_one(db)
        .await
    }

    pub async fn update(
        db: &PgPool,
        id: i64,
        user_id: i64,
        meal_type: Option<&MealType>,
        title: Option<&str>,
        notes: Option<&str>,
        eaten_at: Option<DateTime<Utc>>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, DiaryEntry>(
            "UPDATE diary_entries
             SET meal_type = COALESCE($3, meal_type),
                 title = COALESCE($4, title),
                 notes = COALESCE($5, notes),
                 eaten_at = COALESCE($6, eaten_at)
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
             RETURNING id, user_id, meal_type, title, notes, eaten_at, created_at, updated_at",
        )
        .bind(id)
        .bind(user_id)
        .bind(meal_type)
        .bind(title)
        .bind(notes)
        .bind(eaten_at)
        .fetch_one(db)
        .await
    }

    pub async fn soft_delete(db: &PgPool, id: i64, user_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE diary_entries SET deleted_at = now() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
        )
        .bind(id)
        .bind(user_id)
        .execute(db)
        .await?;
        Ok(())
    }
}

impl EntryLocation {
    pub async fn find_by_entry_id(db: &PgPool, entry_id: i64) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, EntryLocation>(
            "SELECT id, entry_id, name, latitude, longitude, address, created_at, updated_at
             FROM entry_locations WHERE entry_id = $1",
        )
        .bind(entry_id)
        .fetch_optional(db)
        .await
    }

    pub async fn upsert(
        db: &PgPool,
        entry_id: i64,
        name: Option<&str>,
        latitude: f64,
        longitude: f64,
        address: Option<&str>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, EntryLocation>(
            "INSERT INTO entry_locations (entry_id, name, latitude, longitude, address)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (entry_id)
             DO UPDATE SET name = $2, latitude = $3, longitude = $4, address = $5
             RETURNING id, entry_id, name, latitude, longitude, address, created_at, updated_at",
        )
        .bind(entry_id)
        .bind(name)
        .bind(latitude)
        .bind(longitude)
        .bind(address)
        .fetch_one(db)
        .await
    }

    pub async fn delete_by_entry_id(db: &PgPool, entry_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM entry_locations WHERE entry_id = $1")
            .bind(entry_id)
            .execute(db)
            .await?;
        Ok(())
    }
}

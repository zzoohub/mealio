use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::shared::types::MealType;

#[derive(Debug, Clone, Deserialize, utoipa::ToSchema)]
pub enum DiaryOrderBy {
    #[serde(rename = "eaten_at_desc")]
    EatenAtDesc,
    #[serde(rename = "eaten_at_asc")]
    EatenAtAsc,
    #[serde(rename = "rating_desc")]
    RatingDesc,
}

impl DiaryOrderBy {
    pub fn to_sql(&self) -> &'static str {
        match self {
            DiaryOrderBy::EatenAtDesc => "d.eaten_at DESC",
            DiaryOrderBy::EatenAtAsc => "d.eaten_at ASC",
            DiaryOrderBy::RatingDesc => "d.rating DESC NULLS LAST, d.eaten_at DESC",
        }
    }
}

impl Default for DiaryOrderBy {
    fn default() -> Self {
        DiaryOrderBy::EatenAtDesc
    }
}

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct DiaryEntry {
    pub id: i64,
    pub user_id: i64,
    pub meal_type: MealType,
    pub notes: Option<String>,
    pub eaten_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub primary_photo_url: Option<String>,
    pub photo_urls: Vec<String>,
    pub rating: Option<i16>,
    pub would_eat_again: Option<bool>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct DiaryEntryDetail {
    #[serde(flatten)]
    pub entry: DiaryEntry,
    pub location: Option<EntryLocation>,
    pub photos: Vec<super::super::photos::models::EntryPhoto>,
    pub nutrition: Option<super::super::nutrition::models::UserNutrition>,
    pub ingredients: Vec<super::super::ingredients::models::EntryIngredientWithName>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateEntryRequest {
    pub meal_type: MealType,
    pub notes: Option<String>,
    pub eaten_at: Option<DateTime<Utc>>,
    pub location: Option<CreateLocationInput>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateLocationInput {
    pub name: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpdateEntryRequest {
    pub meal_type: Option<MealType>,
    pub notes: Option<String>,
    pub eaten_at: Option<DateTime<Utc>>,
    pub rating: Option<i16>,
    pub would_eat_again: Option<bool>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct DiaryQueryParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub meal_type: Option<MealType>,
    pub q: Option<String>,
    pub tz: Option<String>,
    pub order_by: Option<DiaryOrderBy>,
    pub would_eat_again: Option<bool>,
}

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
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

#[derive(Debug, Deserialize, utoipa::ToSchema)]
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

    /// Uses runtime queries because ORDER BY clause is dynamic.
    /// SAFETY: `to_sql()` returns only `&'static str` from enum variants — no user input reaches `format!()`.
    pub async fn list(
        db: &PgPool,
        user_id: i64,
        params: &DiaryQueryParams,
    ) -> Result<(Vec<Self>, i64), sqlx::Error> {
        let page = params.page.unwrap_or(1).max(1);
        let per_page = params
            .per_page
            .unwrap_or(crate::constants::DEFAULT_PAGE_SIZE)
            .clamp(1, crate::constants::MAX_PAGE_SIZE);
        let offset = (page - 1) * per_page;

        // Sanitize timezone: only allow IANA-like identifiers (letters, digits, /, _, -, +)
        let tz = params.tz.as_deref().filter(|s| {
            s.len() <= 64 && s.bytes().all(|b| b.is_ascii_alphanumeric() || b"/_-+".contains(&b))
        });

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM diary_entries d
             WHERE d.user_id = $1 AND d.deleted_at IS NULL
             AND ($2::date IS NULL OR (d.eaten_at AT TIME ZONE COALESCE($6, 'UTC'))::date >= $2)
             AND ($3::date IS NULL OR (d.eaten_at AT TIME ZONE COALESCE($6, 'UTC'))::date <= $3)
             AND ($4::meal_type IS NULL OR d.meal_type = $4)
             AND ($5::text IS NULL
                  OR d.notes ILIKE '%' || $5 || '%'
                  OR EXISTS (SELECT 1 FROM entry_locations el WHERE el.entry_id = d.id AND (el.name ILIKE '%' || $5 || '%' OR el.address ILIKE '%' || $5 || '%'))
                  OR EXISTS (SELECT 1 FROM entry_ingredients ei JOIN ingredients i ON i.id = ei.ingredient_id WHERE ei.entry_id = d.id AND i.name ILIKE '%' || $5 || '%')
             )
             AND ($7::bool IS NULL OR d.would_eat_again = $7)",
        )
        .bind(user_id)
        .bind(params.start_date)
        .bind(params.end_date)
        .bind(&params.meal_type)
        .bind(&params.q)
        .bind(&tz)
        .bind(params.would_eat_again)
        .fetch_one(db)
        .await?;

        let order_by = params.order_by.clone().unwrap_or_default();

        let entries = sqlx::query_as::<_, DiaryEntry>(
            &format!(
            "SELECT d.id, d.user_id, d.meal_type, d.notes, d.eaten_at, d.created_at, d.updated_at,
                    (SELECT ep.url FROM entry_photos ep
                     WHERE ep.entry_id = d.id
                     ORDER BY ep.is_primary DESC, ep.sort_order, ep.created_at
                     LIMIT 1) AS primary_photo_url,
                    ARRAY(SELECT ep.url FROM entry_photos ep
                          WHERE ep.entry_id = d.id
                          ORDER BY ep.sort_order, ep.created_at) AS photo_urls,
                    d.rating, d.would_eat_again
             FROM diary_entries d
             WHERE d.user_id = $1 AND d.deleted_at IS NULL
             AND ($2::date IS NULL OR (d.eaten_at AT TIME ZONE COALESCE($8, 'UTC'))::date >= $2)
             AND ($3::date IS NULL OR (d.eaten_at AT TIME ZONE COALESCE($8, 'UTC'))::date <= $3)
             AND ($4::meal_type IS NULL OR d.meal_type = $4)
             AND ($5::text IS NULL
                  OR d.notes ILIKE '%' || $5 || '%'
                  OR EXISTS (SELECT 1 FROM entry_locations el WHERE el.entry_id = d.id AND (el.name ILIKE '%' || $5 || '%' OR el.address ILIKE '%' || $5 || '%'))
                  OR EXISTS (SELECT 1 FROM entry_ingredients ei JOIN ingredients i ON i.id = ei.ingredient_id WHERE ei.entry_id = d.id AND i.name ILIKE '%' || $5 || '%')
             )
             AND ($9::bool IS NULL OR d.would_eat_again = $9)
             ORDER BY {}
             LIMIT $6 OFFSET $7", order_by.to_sql()),
        )
        .bind(user_id)
        .bind(params.start_date)
        .bind(params.end_date)
        .bind(&params.meal_type)
        .bind(&params.q)
        .bind(per_page)
        .bind(offset)
        .bind(&tz)
        .bind(params.would_eat_again)
        .fetch_all(db)
        .await?;

        Ok((entries, count.0))
    }

    pub async fn find_by_id(db: &PgPool, id: i64, user_id: i64) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as!(
            DiaryEntry,
            r#"SELECT d.id, d.user_id, d.meal_type as "meal_type: MealType", d.notes, d.eaten_at, d.created_at, d.updated_at,
                    (SELECT ep.url FROM entry_photos ep
                     WHERE ep.entry_id = d.id
                     ORDER BY ep.is_primary DESC, ep.sort_order, ep.created_at
                     LIMIT 1) AS primary_photo_url,
                    ARRAY(SELECT ep.url FROM entry_photos ep
                          WHERE ep.entry_id = d.id
                          ORDER BY ep.sort_order, ep.created_at) AS "photo_urls!: Vec<String>",
                    d.rating, d.would_eat_again
             FROM diary_entries d WHERE d.id = $1 AND d.user_id = $2 AND d.deleted_at IS NULL"#,
            id,
            user_id,
        )
        .fetch_optional(db)
        .await
    }

    pub async fn create(
        db: &PgPool,
        user_id: i64,
        meal_type: &MealType,
        notes: Option<&str>,
        eaten_at: Option<DateTime<Utc>>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as!(
            DiaryEntry,
            r#"INSERT INTO diary_entries (user_id, meal_type, notes, eaten_at)
             VALUES ($1, $2, $3, COALESCE($4, now()))
             RETURNING id, user_id, meal_type as "meal_type: MealType", notes, eaten_at, created_at, updated_at,
                       NULL::text AS primary_photo_url,
                       ARRAY[]::text[] AS "photo_urls!: Vec<String>",
                       rating, would_eat_again"#,
            user_id,
            meal_type as &MealType,
            notes,
            eaten_at,
        )
        .fetch_one(db)
        .await
    }

    pub async fn update(
        db: &PgPool,
        id: i64,
        user_id: i64,
        meal_type: Option<&MealType>,
        notes: Option<&str>,
        eaten_at: Option<DateTime<Utc>>,
        rating: Option<i16>,
        would_eat_again: Option<bool>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as!(
            DiaryEntry,
            r#"UPDATE diary_entries
             SET meal_type = COALESCE($3, meal_type),
                 notes = COALESCE($4, notes),
                 eaten_at = COALESCE($5, eaten_at),
                 rating = COALESCE($6, rating),
                 would_eat_again = COALESCE($7, would_eat_again)
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
             RETURNING id, user_id, meal_type as "meal_type: MealType", notes, eaten_at, created_at, updated_at,
                       (SELECT ep.url FROM entry_photos ep
                        WHERE ep.entry_id = id
                        ORDER BY ep.is_primary DESC, ep.sort_order, ep.created_at
                        LIMIT 1) AS primary_photo_url,
                       ARRAY(SELECT ep.url FROM entry_photos ep
                             WHERE ep.entry_id = id
                             ORDER BY ep.sort_order, ep.created_at) AS "photo_urls!: Vec<String>",
                       rating, would_eat_again"#,
            id,
            user_id,
            meal_type as Option<&MealType>,
            notes,
            eaten_at,
            rating,
            would_eat_again,
        )
        .fetch_one(db)
        .await
    }

    pub async fn soft_delete(db: &PgPool, id: i64, user_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query!(
            "UPDATE diary_entries SET deleted_at = now() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
            id,
            user_id,
        )
        .execute(db)
        .await?;
        Ok(())
    }
}

impl EntryLocation {
    pub async fn find_by_entry_id(db: &PgPool, entry_id: i64) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as!(
            EntryLocation,
            "SELECT id, entry_id, name, latitude, longitude, address, created_at, updated_at
             FROM entry_locations WHERE entry_id = $1",
            entry_id,
        )
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
        sqlx::query_as!(
            EntryLocation,
            "INSERT INTO entry_locations (entry_id, name, latitude, longitude, address)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (entry_id)
             DO UPDATE SET name = $2, latitude = $3, longitude = $4, address = $5
             RETURNING id, entry_id, name, latitude, longitude, address, created_at, updated_at",
            entry_id,
            name,
            latitude,
            longitude,
            address,
        )
        .fetch_one(db)
        .await
    }

    pub async fn delete_by_entry_id(db: &PgPool, entry_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query!("DELETE FROM entry_locations WHERE entry_id = $1", entry_id)
            .execute(db)
            .await?;
        Ok(())
    }
}

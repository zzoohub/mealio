use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct EntryPhoto {
    pub id: i64,
    pub entry_id: i64,
    pub url: String,
    pub caption: Option<String>,
    pub is_primary: bool,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreatePhotoRequest {
    pub url: String,
    pub caption: Option<String>,
    pub is_primary: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpdatePhotoRequest {
    pub caption: Option<String>,
    pub sort_order: Option<i32>,
}

impl EntryPhoto {
    pub async fn list_by_entry_id(db: &PgPool, entry_id: i64) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_as::<_, EntryPhoto>(
            "SELECT id, entry_id, url, caption, is_primary, sort_order, created_at, updated_at
             FROM entry_photos WHERE entry_id = $1 ORDER BY sort_order, created_at",
        )
        .bind(entry_id)
        .fetch_all(db)
        .await
    }

    pub async fn create(
        db: &PgPool,
        entry_id: i64,
        url: &str,
        caption: Option<&str>,
        is_primary: bool,
        sort_order: i32,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, EntryPhoto>(
            "INSERT INTO entry_photos (entry_id, url, caption, is_primary, sort_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, entry_id, url, caption, is_primary, sort_order, created_at, updated_at",
        )
        .bind(entry_id)
        .bind(url)
        .bind(caption)
        .bind(is_primary)
        .bind(sort_order)
        .fetch_one(db)
        .await
    }

    pub async fn find_by_id(db: &PgPool, id: i64, entry_id: i64) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, EntryPhoto>(
            "SELECT id, entry_id, url, caption, is_primary, sort_order, created_at, updated_at
             FROM entry_photos WHERE id = $1 AND entry_id = $2",
        )
        .bind(id)
        .bind(entry_id)
        .fetch_optional(db)
        .await
    }

    pub async fn update(
        db: &PgPool,
        id: i64,
        entry_id: i64,
        caption: Option<&str>,
        sort_order: Option<i32>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, EntryPhoto>(
            "UPDATE entry_photos
             SET caption = COALESCE($3, caption),
                 sort_order = COALESCE($4, sort_order)
             WHERE id = $1 AND entry_id = $2
             RETURNING id, entry_id, url, caption, is_primary, sort_order, created_at, updated_at",
        )
        .bind(id)
        .bind(entry_id)
        .bind(caption)
        .bind(sort_order)
        .fetch_one(db)
        .await
    }

    pub async fn delete(db: &PgPool, id: i64, entry_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM entry_photos WHERE id = $1 AND entry_id = $2")
            .bind(id)
            .bind(entry_id)
            .execute(db)
            .await?;
        Ok(())
    }

    pub async fn set_primary(db: &PgPool, id: i64, entry_id: i64) -> Result<Self, sqlx::Error> {
        // Atomic: set is_primary based on whether id matches, in a single query
        sqlx::query_as::<_, EntryPhoto>(
            "WITH updated AS (
                 UPDATE entry_photos SET is_primary = (id = $1)
                 WHERE entry_id = $2
             )
             SELECT id, entry_id, url, caption, is_primary, sort_order, created_at, updated_at
             FROM entry_photos WHERE id = $1 AND entry_id = $2",
        )
        .bind(id)
        .bind(entry_id)
        .fetch_one(db)
        .await
    }
}

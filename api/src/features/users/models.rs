use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Executor, Postgres};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub display_name: String,
    pub email: String,
    pub photo_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub display_name: Option<String>,
    pub photo_url: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserSettings {
    pub id: i64,
    pub user_id: i64,
    pub theme: String,
    pub language: String,
    pub notifications_enabled: bool,
    pub privacy_profile_public: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub theme: Option<String>,
    pub language: Option<String>,
    pub notifications_enabled: Option<bool>,
    pub privacy_profile_public: Option<bool>,
}

impl User {
    pub async fn find_by_id<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        id: i64,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, User>(
            "SELECT id, display_name, email, photo_url, created_at, updated_at, deleted_at
             FROM users WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(id)
        .fetch_optional(db)
        .await
    }

    pub async fn create<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        display_name: &str,
        email: &str,
        photo_url: Option<&str>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, User>(
            "INSERT INTO users (display_name, email, photo_url)
             VALUES ($1, $2, $3)
             RETURNING id, display_name, email, photo_url, created_at, updated_at, deleted_at",
        )
        .bind(display_name)
        .bind(email)
        .bind(photo_url)
        .fetch_one(db)
        .await
    }

    pub async fn update<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        id: i64,
        display_name: Option<&str>,
        photo_url: Option<&str>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, User>(
            "UPDATE users
             SET display_name = COALESCE($2, display_name),
                 photo_url = COALESCE($3, photo_url)
             WHERE id = $1 AND deleted_at IS NULL
             RETURNING id, display_name, email, photo_url, created_at, updated_at, deleted_at",
        )
        .bind(id)
        .bind(display_name)
        .bind(photo_url)
        .fetch_one(db)
        .await
    }

    pub async fn soft_delete<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        id: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE users SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL")
            .bind(id)
            .execute(db)
            .await?;
        Ok(())
    }
}

impl UserSettings {
    pub async fn find_by_user_id<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        user_id: i64,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, UserSettings>(
            "SELECT id, user_id, theme, language, notifications_enabled, privacy_profile_public, created_at, updated_at
             FROM user_settings WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_one(db)
        .await
    }

    pub async fn update<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        user_id: i64,
        theme: Option<&str>,
        language: Option<&str>,
        notifications_enabled: Option<bool>,
        privacy_profile_public: Option<bool>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, UserSettings>(
            "UPDATE user_settings
             SET theme = COALESCE($2, theme),
                 language = COALESCE($3, language),
                 notifications_enabled = COALESCE($4, notifications_enabled),
                 privacy_profile_public = COALESCE($5, privacy_profile_public)
             WHERE user_id = $1
             RETURNING id, user_id, theme, language, notifications_enabled, privacy_profile_public, created_at, updated_at",
        )
        .bind(user_id)
        .bind(theme)
        .bind(language)
        .bind(notifications_enabled)
        .bind(privacy_profile_public)
        .fetch_one(db)
        .await
    }
}

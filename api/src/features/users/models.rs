use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Executor, Postgres};

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct User {
    pub id: i64,
    pub display_name: String,
    pub email: String,
    pub photo_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpdateUserRequest {
    pub display_name: Option<String>,
    pub photo_url: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow, utoipa::ToSchema)]
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

#[derive(Debug, Deserialize, utoipa::ToSchema)]
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

    pub async fn restore<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        id: i64,
        display_name: &str,
        photo_url: Option<&str>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, User>(
            "UPDATE users
             SET deleted_at = NULL,
                 display_name = $2,
                 photo_url = $3,
                 updated_at = now()
             WHERE id = $1 AND deleted_at IS NOT NULL
             RETURNING id, display_name, email, photo_url, created_at, updated_at, deleted_at",
        )
        .bind(id)
        .bind(display_name)
        .bind(photo_url)
        .fetch_one(db)
        .await
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_struct_has_all_required_fields() {
        let now = Utc::now();
        let user = User {
            id: 1,
            display_name: "Test User".to_string(),
            email: "test@example.com".to_string(),
            photo_url: Some("https://example.com/photo.jpg".to_string()),
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };

        assert_eq!(user.id, 1);
        assert_eq!(user.display_name, "Test User");
        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.photo_url, Some("https://example.com/photo.jpg".to_string()));
        assert!(user.deleted_at.is_none());
    }

    #[test]
    fn test_user_soft_deleted_has_deleted_at() {
        let now = Utc::now();
        let user = User {
            id: 2,
            display_name: "Deleted User".to_string(),
            email: "deleted@example.com".to_string(),
            photo_url: None,
            created_at: now,
            updated_at: now,
            deleted_at: Some(now),
        };

        assert!(user.deleted_at.is_some());
    }

    #[test]
    fn test_user_restored_has_no_deleted_at() {
        let now = Utc::now();
        let user = User {
            id: 3,
            display_name: "Restored User".to_string(),
            email: "restored@example.com".to_string(),
            photo_url: Some("https://example.com/restored.jpg".to_string()),
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };

        assert!(user.deleted_at.is_none());
    }

    #[test]
    fn test_update_user_request_all_fields() {
        let req = UpdateUserRequest {
            display_name: Some("New Name".to_string()),
            photo_url: Some("https://example.com/new.jpg".to_string()),
        };

        assert_eq!(req.display_name, Some("New Name".to_string()));
        assert_eq!(req.photo_url, Some("https://example.com/new.jpg".to_string()));
    }

    #[test]
    fn test_update_user_request_partial_fields() {
        let req = UpdateUserRequest {
            display_name: Some("Only Name".to_string()),
            photo_url: None,
        };

        assert_eq!(req.display_name, Some("Only Name".to_string()));
        assert!(req.photo_url.is_none());
    }

    #[test]
    fn test_update_user_request_no_fields() {
        let req = UpdateUserRequest {
            display_name: None,
            photo_url: None,
        };

        assert!(req.display_name.is_none());
        assert!(req.photo_url.is_none());
    }

    #[test]
    fn test_user_settings_struct() {
        let now = Utc::now();
        let settings = UserSettings {
            id: 1,
            user_id: 123,
            theme: "dark".to_string(),
            language: "en".to_string(),
            notifications_enabled: true,
            privacy_profile_public: false,
            created_at: now,
            updated_at: now,
        };

        assert_eq!(settings.id, 1);
        assert_eq!(settings.user_id, 123);
        assert_eq!(settings.theme, "dark");
        assert_eq!(settings.language, "en");
        assert!(settings.notifications_enabled);
        assert!(!settings.privacy_profile_public);
    }

    #[test]
    fn test_update_settings_request_all_fields() {
        let req = UpdateSettingsRequest {
            theme: Some("light".to_string()),
            language: Some("ko".to_string()),
            notifications_enabled: Some(false),
            privacy_profile_public: Some(true),
        };

        assert_eq!(req.theme, Some("light".to_string()));
        assert_eq!(req.language, Some("ko".to_string()));
        assert_eq!(req.notifications_enabled, Some(false));
        assert_eq!(req.privacy_profile_public, Some(true));
    }

    #[test]
    fn test_update_settings_request_partial_fields() {
        let req = UpdateSettingsRequest {
            theme: Some("dark".to_string()),
            language: None,
            notifications_enabled: None,
            privacy_profile_public: Some(false),
        };

        assert_eq!(req.theme, Some("dark".to_string()));
        assert!(req.language.is_none());
        assert!(req.notifications_enabled.is_none());
        assert_eq!(req.privacy_profile_public, Some(false));
    }

    #[test]
    fn test_update_settings_request_no_fields() {
        let req = UpdateSettingsRequest {
            theme: None,
            language: None,
            notifications_enabled: None,
            privacy_profile_public: None,
        };

        assert!(req.theme.is_none());
        assert!(req.language.is_none());
        assert!(req.notifications_enabled.is_none());
        assert!(req.privacy_profile_public.is_none());
    }
}

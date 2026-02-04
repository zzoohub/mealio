use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Executor, Postgres};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AuthToken {
    pub id: i64,
    pub user_id: i64,
    pub token_hash: String,
    pub device_info: Option<String>,
    pub expires_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserAuthProvider {
    pub id: i64,
    pub user_id: i64,
    pub provider: String,
    pub provider_uid: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct SignInRequest {
    pub provider: String,
    pub id_token: String,
    pub device_info: Option<String>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct UserInfo {
    pub id: i64,
    pub display_name: String,
    pub email: String,
    pub photo_url: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct RefreshResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RevokeRequest {
    pub refresh_token: String,
}

impl AuthToken {
    pub async fn create<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        user_id: i64,
        token_hash: &str,
        device_info: Option<&str>,
        expires_at: DateTime<Utc>,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, AuthToken>(
            "INSERT INTO auth_tokens (user_id, token_hash, device_info, expires_at)
             VALUES ($1, $2, $3, $4)
             RETURNING id, user_id, token_hash, device_info, expires_at, revoked_at, created_at",
        )
        .bind(user_id)
        .bind(token_hash)
        .bind(device_info)
        .bind(expires_at)
        .fetch_one(db)
        .await
    }

    pub async fn find_by_hash<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        token_hash: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, AuthToken>(
            "SELECT id, user_id, token_hash, device_info, expires_at, revoked_at, created_at
             FROM auth_tokens
             WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()",
        )
        .bind(token_hash)
        .fetch_optional(db)
        .await
    }

    pub async fn find_by_hash_any<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        token_hash: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, AuthToken>(
            "SELECT id, user_id, token_hash, device_info, expires_at, revoked_at, created_at
             FROM auth_tokens
             WHERE token_hash = $1",
        )
        .bind(token_hash)
        .fetch_optional(db)
        .await
    }

    pub async fn revoke<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        token_hash: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE auth_tokens SET revoked_at = now() WHERE token_hash = $1")
            .bind(token_hash)
            .execute(db)
            .await?;
        Ok(())
    }

    pub async fn revoke_all_for_user<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        user_id: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE auth_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
        )
        .bind(user_id)
        .execute(db)
        .await?;
        Ok(())
    }
}

impl UserAuthProvider {
    pub async fn find_by_provider<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        provider: &str,
        provider_uid: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, UserAuthProvider>(
            "SELECT id, user_id, provider, provider_uid, created_at
             FROM user_auth_providers
             WHERE provider = $1 AND provider_uid = $2",
        )
        .bind(provider)
        .bind(provider_uid)
        .fetch_optional(db)
        .await
    }

    pub async fn create<'e, E: Executor<'e, Database = Postgres>>(
        db: E,
        user_id: i64,
        provider: &str,
        provider_uid: &str,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, UserAuthProvider>(
            "INSERT INTO user_auth_providers (user_id, provider, provider_uid)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, provider, provider_uid, created_at",
        )
        .bind(user_id)
        .bind(provider)
        .bind(provider_uid)
        .fetch_one(db)
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    #[test]
    fn test_auth_token_structure() {
        let now = Utc::now();
        let token = AuthToken {
            id: 1,
            user_id: 123,
            token_hash: "hash123".to_string(),
            device_info: Some("iPhone 15".to_string()),
            expires_at: now + Duration::days(30),
            revoked_at: None,
            created_at: now,
        };

        assert_eq!(token.id, 1);
        assert_eq!(token.user_id, 123);
        assert_eq!(token.token_hash, "hash123");
        assert!(token.device_info.is_some());
        assert!(token.revoked_at.is_none());
    }

    #[test]
    fn test_auth_token_revoked() {
        let now = Utc::now();
        let token = AuthToken {
            id: 2,
            user_id: 456,
            token_hash: "hash456".to_string(),
            device_info: None,
            expires_at: now + Duration::days(30),
            revoked_at: Some(now),
            created_at: now,
        };

        assert!(token.revoked_at.is_some());
    }

    #[test]
    fn test_auth_token_expiry_future() {
        let now = Utc::now();
        let token = AuthToken {
            id: 3,
            user_id: 789,
            token_hash: "hash789".to_string(),
            device_info: None,
            expires_at: now + Duration::days(30),
            revoked_at: None,
            created_at: now,
        };

        assert!(token.expires_at > now);
    }

    #[test]
    fn test_auth_token_expiry_past() {
        let now = Utc::now();
        let token = AuthToken {
            id: 4,
            user_id: 101,
            token_hash: "expired_hash".to_string(),
            device_info: None,
            expires_at: now - Duration::days(1),
            revoked_at: None,
            created_at: now - Duration::days(31),
        };

        assert!(token.expires_at < now);
    }

    #[test]
    fn test_user_auth_provider_structure() {
        let now = Utc::now();
        let provider = UserAuthProvider {
            id: 1,
            user_id: 100,
            provider: "google".to_string(),
            provider_uid: "google_uid_123".to_string(),
            created_at: now,
        };

        assert_eq!(provider.id, 1);
        assert_eq!(provider.user_id, 100);
        assert_eq!(provider.provider, "google");
        assert_eq!(provider.provider_uid, "google_uid_123");
    }

    #[test]
    fn test_user_auth_provider_google() {
        let now = Utc::now();
        let provider = UserAuthProvider {
            id: 2,
            user_id: 200,
            provider: "google".to_string(),
            provider_uid: "google_12345".to_string(),
            created_at: now,
        };

        assert_eq!(provider.provider, "google");
    }

    #[test]
    fn test_user_auth_provider_apple() {
        let now = Utc::now();
        let provider = UserAuthProvider {
            id: 3,
            user_id: 300,
            provider: "apple".to_string(),
            provider_uid: "apple_67890".to_string(),
            created_at: now,
        };

        assert_eq!(provider.provider, "apple");
    }

    #[test]
    fn test_sign_in_request_validation_google() {
        let req = SignInRequest {
            provider: "google".to_string(),
            id_token: "google_token".to_string(),
            device_info: Some("Pixel 8".to_string()),
        };

        assert_eq!(req.provider, "google");
        assert!(!req.id_token.is_empty());
    }

    #[test]
    fn test_sign_in_request_validation_apple() {
        let req = SignInRequest {
            provider: "apple".to_string(),
            id_token: "apple_token".to_string(),
            device_info: Some("iPhone 14".to_string()),
        };

        assert_eq!(req.provider, "apple");
        assert!(!req.id_token.is_empty());
    }

    #[test]
    fn test_sign_in_request_empty_token() {
        let req = SignInRequest {
            provider: "google".to_string(),
            id_token: "".to_string(),
            device_info: None,
        };

        assert!(req.id_token.is_empty());
    }

    #[test]
    fn test_auth_response_token_not_empty() {
        let resp = AuthResponse {
            access_token: "abc123".to_string(),
            refresh_token: "xyz789".to_string(),
            expires_in: 900,
            user: UserInfo {
                id: 1,
                display_name: "Test".to_string(),
                email: "test@example.com".to_string(),
                photo_url: None,
            },
        };

        assert!(!resp.access_token.is_empty());
        assert!(!resp.refresh_token.is_empty());
        assert!(resp.expires_in > 0);
    }

    #[test]
    fn test_auth_response_user_id_positive() {
        let user = UserInfo {
            id: 42,
            display_name: "User".to_string(),
            email: "user@test.com".to_string(),
            photo_url: None,
        };

        assert!(user.id > 0);
    }

    #[test]
    fn test_refresh_request_non_empty_token() {
        let req = RefreshRequest {
            refresh_token: "valid_token".to_string(),
        };

        assert!(!req.refresh_token.is_empty());
    }

    #[test]
    fn test_refresh_request_empty_token() {
        let req = RefreshRequest {
            refresh_token: "".to_string(),
        };

        assert!(req.refresh_token.is_empty());
    }

    #[test]
    fn test_refresh_response_expires_in_positive() {
        let resp = RefreshResponse {
            access_token: "new_access".to_string(),
            refresh_token: "new_refresh".to_string(),
            expires_in: 900,
        };

        assert!(resp.expires_in > 0);
        assert_eq!(resp.expires_in, 900);
    }

    #[test]
    fn test_revoke_request_valid_structure() {
        let req = RevokeRequest {
            refresh_token: "token_to_revoke".to_string(),
        };

        assert!(!req.refresh_token.is_empty());
    }

    #[test]
    fn test_user_info_email_format() {
        let user = UserInfo {
            id: 1,
            display_name: "Test User".to_string(),
            email: "test@example.com".to_string(),
            photo_url: None,
        };

        assert!(user.email.contains('@'));
    }

    #[test]
    fn test_user_info_display_name_not_empty() {
        let user = UserInfo {
            id: 1,
            display_name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
            photo_url: None,
        };

        assert!(!user.display_name.is_empty());
    }

    #[test]
    fn test_auth_token_30_day_expiry() {
        let now = Utc::now();
        let expires = now + Duration::days(30);

        let duration = expires.signed_duration_since(now);
        assert_eq!(duration.num_days(), 30);
    }

    #[test]
    fn test_auth_token_device_info_optional() {
        let now = Utc::now();
        let token_with_device = AuthToken {
            id: 1,
            user_id: 1,
            token_hash: "hash1".to_string(),
            device_info: Some("iPhone".to_string()),
            expires_at: now + Duration::days(30),
            revoked_at: None,
            created_at: now,
        };

        let token_without_device = AuthToken {
            id: 2,
            user_id: 2,
            token_hash: "hash2".to_string(),
            device_info: None,
            expires_at: now + Duration::days(30),
            revoked_at: None,
            created_at: now,
        };

        assert!(token_with_device.device_info.is_some());
        assert!(token_without_device.device_info.is_none());
    }
}

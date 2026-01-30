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

#[derive(Debug, Deserialize)]
pub struct SignInRequest {
    pub provider: String,
    pub id_token: String,
    pub device_info: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: i64,
    pub display_name: String,
    pub email: String,
    pub photo_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct RefreshResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

#[derive(Debug, Deserialize)]
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

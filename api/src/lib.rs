pub mod constants;
pub mod error;
pub mod extractors;
pub mod features;
pub mod openapi;
pub mod response;
pub mod shared;

use sqlx::PgPool;

use crate::features::auth::JwksCache;

#[derive(Clone)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub google_client_id: String,
    pub apple_team_id: String,
    pub apple_bundle_id: String,
    pub jwks_cache: JwksCache,
}

#[derive(Clone)]
pub struct StorageConfig {
    pub s3_client: aws_sdk_s3::Client,
    pub r2_bucket: String,
    pub r2_public_url: String,
}

#[derive(Clone)]
pub struct AiConfig {
    pub gemini_api_key: String,
    pub gemini_model: String,
    pub http_client: reqwest::Client,
}

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub auth: AuthConfig,
    pub storage: StorageConfig,
    pub ai: AiConfig,
}

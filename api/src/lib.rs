pub mod error;
pub mod extractors;
pub mod features;
pub mod openapi;
pub mod response;
pub mod shared;

use sqlx::PgPool;

use crate::features::auth::JwksCache;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub jwt_secret: String,
    pub google_client_id: String,
    pub apple_team_id: String,
    pub apple_bundle_id: String,
    pub jwks_cache: JwksCache,
}

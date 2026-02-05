use std::path::Path;
use std::time::Duration;

use axum::routing::get;
use axum::Router;
use sqlx::migrate::Migrator;
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use mealio_api::features;
use mealio_api::features::auth::JwksCache;
use mealio_api::openapi::ApiDoc;
use mealio_api::AppState;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let google_client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default();
    let apple_team_id = std::env::var("APPLE_TEAM_ID").unwrap_or_default();
    let apple_bundle_id = std::env::var("APPLE_BUNDLE_ID").unwrap_or_default();

    // R2 / S3-compatible storage
    let r2_account_id = std::env::var("R2_ACCOUNT_ID").unwrap_or_default();
    let r2_access_key_id = std::env::var("R2_ACCESS_KEY_ID").unwrap_or_default();
    let r2_secret_access_key = std::env::var("R2_SECRET_ACCESS_KEY").unwrap_or_default();
    let r2_bucket = std::env::var("R2_BUCKET_NAME").unwrap_or_else(|_| "mealio-uploads".into());
    let r2_public_url = std::env::var("R2_PUBLIC_URL").unwrap_or_default();

    let s3_config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .endpoint_url(format!(
            "https://{}.r2.cloudflarestorage.com",
            r2_account_id
        ))
        .region(aws_config::Region::new("auto"))
        .credentials_provider(aws_sdk_s3::config::Credentials::new(
            r2_access_key_id,
            r2_secret_access_key,
            None,
            None,
            "r2",
        ))
        .load()
        .await;

    let s3_client = aws_sdk_s3::Client::from_conf(
        aws_sdk_s3::config::Builder::from(&s3_config)
            .force_path_style(true)
            .build(),
    );

    let db = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&database_url)
        .await
        .expect("failed to connect to database");

    let migrator = Migrator::new(Path::new("./migrations"))
        .await
        .expect("failed to load migrations");
    migrator.run(&db).await.expect("failed to run migrations");

    let jwks_cache = JwksCache::new(Duration::from_secs(3600));

    let state = AppState {
        db,
        jwt_secret,
        google_client_id,
        apple_team_id,
        apple_bundle_id,
        jwks_cache,
        s3_client,
        r2_bucket,
        r2_public_url,
    };

    let cors = build_cors();

    let api = Router::new()
        .nest("/auth", features::auth::router())
        .nest("/users", features::users::router())
        .nest("/diary", features::diary::router())
        .nest("/diary", features::photos::router())
        .nest("/diary", features::nutrition::router())
        .nest("/diary", features::ai_analyses::router())
        .nest("/ingredients", features::ingredients::ingredient_router())
        .nest("/diary", features::ingredients::entry_ingredient_router())
        .nest("/statistics", features::statistics::router())
        .nest("/uploads", features::uploads::router());

    let app = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .route("/health", get(|| async { "ok" }))
        .nest("/api/v1", api)
        .layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".into());
    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|_| panic!("failed to bind to {addr}"));

    tracing::info!("listening on {addr}");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("server error");
}

fn build_cors() -> CorsLayer {
    let allowed_origins = std::env::var("CORS_ORIGINS").unwrap_or_default();

    if allowed_origins.is_empty() || allowed_origins == "*" {
        // Development: permissive
        CorsLayer::permissive()
    } else {
        // Production: explicit origins
        let origins: Vec<_> = allowed_origins
            .split(',')
            .filter_map(|s| s.trim().parse().ok())
            .collect();
        CorsLayer::new()
            .allow_origin(AllowOrigin::list(origins))
            .allow_methods(AllowMethods::any())
            .allow_headers(AllowHeaders::any())
    }
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install signal handler");
    tracing::info!("shutting down");
}

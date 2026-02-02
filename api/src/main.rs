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
        .nest("/statistics", features::statistics::router());

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

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("failed to bind to port 3000");

    tracing::info!("listening on 0.0.0.0:3000");

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

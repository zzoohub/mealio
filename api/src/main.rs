use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use axum::extract::{Path as AxumPath, State};
use axum::response::Html;
use axum::routing::get;
use axum::{Json, Router};
use sqlx::migrate::Migrator;
use sqlx::postgres::PgPoolOptions;
use tower_governor::governor::GovernorConfigBuilder;
use tower_governor::key_extractor::SmartIpKeyExtractor;
use tower_governor::GovernorLayer;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::prelude::*;
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

    let sentry_dsn = std::env::var("SENTRY_DSN").ok().filter(|s| !s.is_empty());
    let _sentry_guard = sentry::init((
        sentry_dsn,
        sentry::ClientOptions {
            release: sentry::release_name!(),
            traces_sample_rate: 0.2,
            ..Default::default()
        },
    ));

    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into());
    let use_json = std::env::var("LOG_FORMAT").unwrap_or_default() == "json";
    if use_json {
        tracing_subscriber::registry()
            .with(env_filter)
            .with(tracing_subscriber::fmt::layer().json())
            .with(sentry_tracing::layer())
            .init();
    } else {
        tracing_subscriber::registry()
            .with(env_filter)
            .with(tracing_subscriber::fmt::layer())
            .with(sentry_tracing::layer())
            .init();
    }

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

    let gemini_api_key = std::env::var("GEMINI_API_KEY").unwrap_or_default();
    let gemini_model = std::env::var("GEMINI_MODEL").unwrap_or_else(|_| "gemini-2.5-flash".to_string());

    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .expect("failed to build HTTP client");

    let jwks_cache = JwksCache::new(Duration::from_secs(3600));

    // Recover stuck AI analyses (pending/processing > 5 min)
    {
        use mealio_api::features::ai_analyses::models::AiAnalysis;
        match AiAnalysis::find_stuck(&db, 5).await {
            Ok(stuck) => {
                for a in &stuck {
                    if let Err(e) = AiAnalysis::mark_failed(&db, a.id, "Server restarted during analysis").await {
                        tracing::error!(analysis_id = a.id, error = %e, "failed to recover stuck analysis");
                    }
                }
                if !stuck.is_empty() {
                    tracing::info!(count = stuck.len(), "recovered stuck AI analyses");
                }
            }
            Err(e) => tracing::error!(error = %e, "failed to find stuck analyses"),
        }
    }

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
        gemini_api_key,
        gemini_model,
        http_client,
    };

    let cors = build_cors();

    // Rate limiting: 10 req/min for auth, 60 req/min global
    let auth_governor = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(6) // 1 token every 6 seconds = 10 req/min
            .burst_size(10)
            .key_extractor(SmartIpKeyExtractor)
            .finish()
            .expect("failed to build auth rate limiter"),
    );

    let global_governor = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(1) // 1 token every second = 60 req/min
            .burst_size(60)
            .key_extractor(SmartIpKeyExtractor)
            .finish()
            .expect("failed to build global rate limiter"),
    );

    let auth_routes = features::auth::router()
        .layer(GovernorLayer { config: auth_governor });

    let api = Router::new()
        .nest("/auth", auth_routes)
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
        .route("/health", get(health))
        .route("/diary/{id}", get(diary_fallback))
        .route("/", get(landing_page))
        .route(
            "/.well-known/apple-app-site-association",
            get(apple_app_site_association),
        )
        .route("/.well-known/assetlinks.json", get(asset_links))
        .nest("/api/v1", api)
        .layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        .layer(GovernorLayer { config: global_governor })
        .layer(TraceLayer::new_for_http())
        .layer(sentry_tower::NewSentryLayer::new_from_top())
        .layer(sentry_tower::SentryHttpLayer::new().enable_transaction())
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".into());
    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|_| panic!("failed to bind to {addr}"));

    tracing::info!("listening on {addr}");

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("server error");
}

async fn health(State(state): State<AppState>) -> Json<serde_json::Value> {
    let db_ok = sqlx::query_scalar!("SELECT 1::int4")
        .fetch_one(&state.db)
        .await
        .is_ok();

    Json(serde_json::json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "db": if db_ok { "connected" } else { "unreachable" },
    }))
}

async fn apple_app_site_association() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "applinks": {
            "apps": [],
            "details": [
                {
                    "appIDs": ["6VMN7W3K93.com.zzoo.mealio"],
                    "paths": ["/diary/*", "/"]
                }
            ]
        }
    }))
}

async fn asset_links() -> Json<serde_json::Value> {
    Json(serde_json::json!([
        {
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": "com.zzoo.mealio",
                "sha256_cert_fingerprints": ["B7:F3:36:83:CD:C4:1B:56:FC:94:29:7E:66:DD:4A:A7:2A:A1:6D:3E:06:9E:8D:9D:36:D6:BA:4B:F8:60:40:0F"]
            }
        }
    ]))
}

async fn diary_fallback(AxumPath(id): AxumPath<i64>) -> Html<String> {
    if id <= 0 {
        let Html(html) = landing_page().await;
        return Html(html.to_string());
    }
    let url = format!("https://mealio.zzooapp.com/diary/{id}");
    let deep_link = format!("mealio://diary/{id}");
    Html(format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mealio</title>
<meta property="og:title" content="Mealio">
<meta property="og:description" content="Check out this meal on Mealio!">
<meta property="og:url" content="{url}">
<meta property="og:type" content="website">
<meta name="apple-itunes-app" content="app-id=6746208498, app-argument={url}">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f8f9fa;color:#333}}
.card{{text-align:center;padding:48px 32px;max-width:400px}}
h1{{font-size:32px;margin-bottom:8px}}
p{{font-size:16px;color:#666;margin-bottom:32px}}
.buttons{{display:flex;flex-direction:column;gap:12px}}
a{{display:block;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600}}
.app-store{{background:#000;color:#fff}}
.play-store{{background:#01875f;color:#fff}}
</style>
</head>
<body>
<div class="card">
<h1>Mealio</h1>
<p>Track your meals with ease</p>
<div class="buttons">
<a class="app-store" href="https://apps.apple.com/app/mealio/id6746208498">Download on the App Store</a>
<a class="play-store" href="https://play.google.com/store/apps/details?id=com.zzoo.mealio">Get it on Google Play</a>
</div>
</div>
<script>
(function(){{
  var deep="{deep_link}";
  var start=Date.now();
  window.location.href=deep;
  setTimeout(function(){{
    if(Date.now()-start<2000){{}}
  }},1500);
}})();
</script>
</body>
</html>"#
    ))
}

async fn landing_page() -> Html<&'static str> {
    Html(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mealio - Track your meals</title>
<meta property="og:title" content="Mealio">
<meta property="og:description" content="Track your meals with ease">
<meta property="og:url" content="https://mealio.zzooapp.com">
<meta property="og:type" content="website">
<meta name="apple-itunes-app" content="app-id=6746208498">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f8f9fa;color:#333}
.card{text-align:center;padding:48px 32px;max-width:400px}
h1{font-size:32px;margin-bottom:8px}
p{font-size:16px;color:#666;margin-bottom:32px}
.buttons{display:flex;flex-direction:column;gap:12px}
a{display:block;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600}
.app-store{background:#000;color:#fff}
.play-store{background:#01875f;color:#fff}
</style>
</head>
<body>
<div class="card">
<h1>Mealio</h1>
<p>Track your meals with ease</p>
<div class="buttons">
<a class="app-store" href="https://apps.apple.com/app/mealio/id6746208498">Download on the App Store</a>
<a class="play-store" href="https://play.google.com/store/apps/details?id=com.zzoo.mealio">Get it on Google Play</a>
</div>
</div>
</body>
</html>"#,
    )
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_apple_app_site_association_returns_correct_structure() {
        let response = apple_app_site_association().await;
        let json = response.0;

        // Verify top-level structure
        assert!(json.get("applinks").is_some(), "Response should contain 'applinks' key");

        let applinks = json.get("applinks").unwrap();
        assert!(applinks.get("apps").is_some(), "applinks should contain 'apps' key");
        assert!(applinks.get("details").is_some(), "applinks should contain 'details' key");
    }

    #[tokio::test]
    async fn test_apple_app_site_association_contains_correct_app_id() {
        let response = apple_app_site_association().await;
        let json = response.0;

        let details = json["applinks"]["details"].as_array().unwrap();
        assert_eq!(details.len(), 1, "Should have exactly one detail entry");

        let first_detail = &details[0];
        let app_ids = first_detail["appIDs"].as_array().unwrap();

        assert_eq!(app_ids.len(), 1, "Should have exactly one appID");
        assert_eq!(
            app_ids[0].as_str().unwrap(),
            "6VMN7W3K93.com.zzoo.mealio",
            "appID should match expected value"
        );
    }

    #[tokio::test]
    async fn test_apple_app_site_association_contains_correct_paths() {
        let response = apple_app_site_association().await;
        let json = response.0;

        let details = json["applinks"]["details"].as_array().unwrap();
        let paths = details[0]["paths"].as_array().unwrap();

        assert_eq!(paths.len(), 2, "Should have exactly two paths");
        assert_eq!(paths[0].as_str().unwrap(), "/diary/*");
        assert_eq!(paths[1].as_str().unwrap(), "/");
    }

    #[tokio::test]
    async fn test_apple_app_site_association_apps_array_is_empty() {
        let response = apple_app_site_association().await;
        let json = response.0;

        let apps = json["applinks"]["apps"].as_array().unwrap();
        assert_eq!(apps.len(), 0, "apps array should be empty");
    }

    #[tokio::test]
    async fn test_asset_links_returns_array() {
        let response = asset_links().await;
        let json = response.0;

        assert!(json.is_array(), "Response should be an array");
        let array = json.as_array().unwrap();
        assert_eq!(array.len(), 1, "Should have exactly one asset link entry");
    }

    #[tokio::test]
    async fn test_asset_links_contains_correct_package_name() {
        let response = asset_links().await;
        let json = response.0;

        let array = json.as_array().unwrap();
        let first_entry = &array[0];

        let target = first_entry.get("target").unwrap();
        let package_name = target.get("package_name").unwrap().as_str().unwrap();

        assert_eq!(
            package_name,
            "com.zzoo.mealio",
            "package_name should match expected value"
        );
    }

    #[tokio::test]
    async fn test_asset_links_contains_correct_namespace() {
        let response = asset_links().await;
        let json = response.0;

        let array = json.as_array().unwrap();
        let target = array[0].get("target").unwrap();
        let namespace = target.get("namespace").unwrap().as_str().unwrap();

        assert_eq!(namespace, "android_app", "namespace should be 'android_app'");
    }

    #[tokio::test]
    async fn test_asset_links_contains_correct_relation() {
        let response = asset_links().await;
        let json = response.0;

        let array = json.as_array().unwrap();
        let relation = array[0].get("relation").unwrap().as_array().unwrap();

        assert_eq!(relation.len(), 1, "Should have exactly one relation");
        assert_eq!(
            relation[0].as_str().unwrap(),
            "delegate_permission/common.handle_all_urls"
        );
    }

    #[tokio::test]
    async fn test_asset_links_sha256_fingerprints_is_empty_array() {
        let response = asset_links().await;
        let json = response.0;

        let array = json.as_array().unwrap();
        let target = array[0].get("target").unwrap();
        let fingerprints = target.get("sha256_cert_fingerprints").unwrap().as_array().unwrap();

        assert_eq!(fingerprints.len(), 1, "sha256_cert_fingerprints should have one entry");
        assert_eq!(
            fingerprints[0].as_str().unwrap(),
            "B7:F3:36:83:CD:C4:1B:56:FC:94:29:7E:66:DD:4A:A7:2A:A1:6D:3E:06:9E:8D:9D:36:D6:BA:4B:F8:60:40:0F"
        );
    }

    #[tokio::test]
    async fn test_apple_app_site_association_json_serialization() {
        // Test that the response can be serialized to JSON string without errors
        let response = apple_app_site_association().await;
        let json_string = serde_json::to_string(&response.0).unwrap();

        assert!(json_string.contains("6VMN7W3K93.com.zzoo.mealio"));
        assert!(json_string.contains("applinks"));
    }

    #[tokio::test]
    async fn test_asset_links_json_serialization() {
        // Test that the response can be serialized to JSON string without errors
        let response = asset_links().await;
        let json_string = serde_json::to_string(&response.0).unwrap();

        assert!(json_string.contains("com.zzoo.mealio"));
        assert!(json_string.contains("delegate_permission/common.handle_all_urls"));
    }

    #[tokio::test]
    async fn test_diary_fallback_contains_og_tags() {
        let response = diary_fallback(AxumPath(123)).await;
        let html = response.0;

        assert!(html.contains(r#"og:title" content="Mealio"#));
        assert!(html.contains(r#"og:description"#));
        assert!(html.contains(r#"og:url" content="https://mealio.zzooapp.com/diary/123"#));
    }

    #[tokio::test]
    async fn test_diary_fallback_contains_deep_link() {
        let response = diary_fallback(AxumPath(456)).await;
        let html = response.0;

        assert!(html.contains("mealio://diary/456"));
    }

    #[tokio::test]
    async fn test_diary_fallback_contains_app_store_links() {
        let response = diary_fallback(AxumPath(1)).await;
        let html = response.0;

        assert!(html.contains("apps.apple.com/app/mealio/id6746208498"));
        assert!(html.contains("play.google.com/store/apps/details?id=com.zzoo.mealio"));
    }

    #[tokio::test]
    async fn test_landing_page_contains_mealio() {
        let response = landing_page().await;
        let html = response.0;

        assert!(html.contains("Mealio"));
        assert!(html.contains(r#"og:title" content="Mealio"#));
    }

    #[tokio::test]
    async fn test_landing_page_contains_app_store_links() {
        let response = landing_page().await;
        let html = response.0;

        assert!(html.contains("apps.apple.com/app/mealio/id6746208498"));
        assert!(html.contains("play.google.com/store/apps/details?id=com.zzoo.mealio"));
    }
}

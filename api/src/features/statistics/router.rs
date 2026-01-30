use axum::routing::get;
use axum::Router;

use crate::AppState;

use super::handlers;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/nutrition", get(handlers::nutrition_stats))
        .route("/meal-types", get(handlers::meal_type_stats))
        .route("/top-ingredients", get(handlers::top_ingredients))
        .route("/overview", get(handlers::overview))
}

use axum::routing::get;
use axum::Router;

use crate::AppState;

use super::handlers;

pub fn router() -> Router<AppState> {
    Router::new().route(
        "/{entry_id}/nutrition",
        get(handlers::get_nutrition)
            .put(handlers::upsert_nutrition)
            .delete(handlers::delete_nutrition),
    )
}

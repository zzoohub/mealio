use axum::routing::get;
use axum::Router;

use crate::AppState;

use super::handlers;

pub fn router() -> Router<AppState> {
    Router::new().route(
        "/{entry_id}/analysis",
        get(handlers::get_analysis).post(handlers::create_analysis),
    )
}

use axum::routing::{delete, get};
use axum::Router;

use crate::AppState;

use super::handlers;

pub fn ingredient_router() -> Router<AppState> {
    Router::new().route(
        "/",
        get(handlers::search_ingredients).post(handlers::create_ingredient),
    )
}

pub fn entry_ingredient_router() -> Router<AppState> {
    Router::new()
        .route(
            "/{entry_id}/ingredients",
            get(handlers::list_entry_ingredients)
                .post(handlers::link_ingredient)
                .put(handlers::sync_ingredients),
        )
        .route(
            "/{entry_id}/ingredients/{ingredient_id}",
            delete(handlers::unlink_ingredient),
        )
}

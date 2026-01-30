use axum::routing::{get, post};
use axum::Router;

use crate::AppState;

use super::handlers;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/{entry_id}/photos",
            get(handlers::list_photos).post(handlers::create_photo),
        )
        .route(
            "/{entry_id}/photos/{id}",
            axum::routing::patch(handlers::update_photo).delete(handlers::delete_photo),
        )
        .route(
            "/{entry_id}/photos/{id}/primary",
            post(handlers::set_primary_photo),
        )
}

use axum::routing::get;
use axum::Router;

use crate::AppState;

use super::handlers;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handlers::list_entries).post(handlers::create_entry))
        .route(
            "/{id}",
            get(handlers::get_entry)
                .patch(handlers::update_entry)
                .delete(handlers::delete_entry),
        )
        .route("/{id}/location", get(handlers::get_location).put(handlers::upsert_location).delete(handlers::delete_location))
}

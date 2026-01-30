use axum::routing::get;
use axum::Router;

use crate::AppState;

use super::handlers;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/me", get(handlers::get_me).patch(handlers::update_me).delete(handlers::delete_me))
        .route("/me/settings", get(handlers::get_settings).patch(handlers::update_settings))
}

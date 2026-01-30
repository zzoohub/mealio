use axum::routing::post;
use axum::Router;

use crate::AppState;

use super::handlers;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/sign-in", post(handlers::sign_in))
        .route("/refresh", post(handlers::refresh))
        .route("/revoke", post(handlers::revoke))
}

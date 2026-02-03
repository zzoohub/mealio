use axum::routing::post;
use axum::Router;

use crate::AppState;

use super::handlers;

pub fn router() -> Router<AppState> {
    Router::new().route("/presign", post(handlers::presign))
}

use axum::extract::Path;
use axum::Json;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::response;

use super::models::*;

#[utoipa::path(
    get,
    path = "/api/v1/diary/{entry_id}/analysis",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    responses(
        (status = 200, description = "AI analysis", body = AiAnalysis),
        (status = 501, description = "Not implemented", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "AI Analysis"
)]
pub async fn get_analysis(
    _auth: AuthUser,
    Db(_db): Db,
    Path(_entry_id): Path<i64>,
) -> Result<response::Ok<AiAnalysis>, AppError> {
    Err(AppError::NotImplemented(
        "AI analysis is not yet available".into(),
    ))
}

#[utoipa::path(
    post,
    path = "/api/v1/diary/{entry_id}/analysis",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    request_body = CreateAnalysisRequest,
    responses(
        (status = 201, description = "Analysis created", body = AiAnalysis),
        (status = 501, description = "Not implemented", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "AI Analysis"
)]
pub async fn create_analysis(
    _auth: AuthUser,
    Db(_db): Db,
    Path(_entry_id): Path<i64>,
    Json(_req): Json<CreateAnalysisRequest>,
) -> Result<response::Created<AiAnalysis>, AppError> {
    Err(AppError::NotImplemented(
        "AI analysis is not yet available".into(),
    ))
}

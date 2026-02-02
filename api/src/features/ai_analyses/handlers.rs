use axum::extract::Path;
use axum::Json;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::features::diary::models::DiaryEntry;
use crate::response;

use super::models::*;

#[utoipa::path(
    get,
    path = "/api/v1/diary/{entry_id}/analysis",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    responses(
        (status = 200, description = "AI analysis", body = AiAnalysis),
        (status = 404, description = "Not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "AI Analysis"
)]
pub async fn get_analysis(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
) -> Result<response::Ok<AiAnalysis>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;

    let analysis = AiAnalysis::find_by_entry_id(&db, entry_id)
        .await?
        .ok_or_else(|| AppError::NotFound("analysis not found".into()))?;

    Ok(response::Ok(analysis))
}

#[utoipa::path(
    post,
    path = "/api/v1/diary/{entry_id}/analysis",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    request_body = CreateAnalysisRequest,
    responses(
        (status = 201, description = "Analysis created", body = AiAnalysis),
    ),
    security(("bearer_auth" = [])),
    tag = "AI Analysis"
)]
pub async fn create_analysis(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
    Json(req): Json<CreateAnalysisRequest>,
) -> Result<response::Created<AiAnalysis>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;

    let analysis = AiAnalysis::create(&db, entry_id, &req).await?;
    Ok(response::Created(analysis))
}

use axum::extract::{Path, State};

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::features::diary::models::DiaryEntry;
use crate::features::photos::models::EntryPhoto;
use crate::response;
use crate::AppState;

use super::models::*;
use super::service;

#[utoipa::path(
    get,
    path = "/api/v1/diary/{entry_id}/analysis",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    responses(
        (status = 200, description = "AI analysis", body = AiAnalysis),
        (status = 404, description = "No analysis found", body = crate::error::ProblemDetail),
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
        .ok_or_else(|| AppError::NotFound("no analysis found for this entry".into()))?;

    Ok(response::Ok(analysis))
}

#[utoipa::path(
    post,
    path = "/api/v1/diary/{entry_id}/analyze",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    responses(
        (status = 202, description = "Analysis triggered", body = AiAnalysis),
        (status = 400, description = "No photos or AI disabled", body = crate::error::ProblemDetail),
        (status = 404, description = "Entry not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "AI Analysis"
)]
pub async fn trigger_analysis(
    auth: AuthUser,
    Db(db): Db,
    State(state): State<AppState>,
    Path(entry_id): Path<i64>,
) -> Result<response::Accepted<AiAnalysis>, AppError> {
    // Verify ownership
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;

    // Check if AI is enabled
    if state.gemini_api_key.is_empty() {
        return Err(AppError::BadRequest("AI analysis is not available".into()));
    }

    // Check if entry has photos
    let photos = EntryPhoto::list_by_entry_id(&db, entry_id).await?;
    if photos.is_empty() {
        return Err(AppError::BadRequest("entry has no photos to analyze".into()));
    }

    // Idempotency: check existing analysis
    if let Some(existing) = AiAnalysis::find_by_entry_id(&db, entry_id).await? {
        match existing.status.as_str() {
            "pending" | "processing" => {
                // Already in progress, return existing
                return Ok(response::Accepted(existing));
            }
            "completed" => {
                // Already done, return existing
                return Ok(response::Accepted(existing));
            }
            "failed" => {
                // Delete failed analysis to allow retry
                AiAnalysis::delete_by_id(&db, existing.id).await?;
            }
            _ => {}
        }
    }

    // Create pending analysis
    let analysis = AiAnalysis::create_pending(&db, entry_id).await?;

    // Spawn background task
    let analysis_id = analysis.id;
    let bg_db = db.clone();
    let bg_client = state.http_client.clone();
    let bg_key = state.gemini_api_key.clone();
    let bg_r2_url = state.r2_public_url.clone();

    tokio::spawn(async move {
        service::run_analysis(bg_db, bg_client, bg_key, bg_r2_url, analysis_id, entry_id).await;
    });

    Ok(response::Accepted(analysis))
}

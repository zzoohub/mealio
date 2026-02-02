use axum::extract::Path;
use axum::Json;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::features::diary::models::DiaryEntry;
use crate::response;

use super::models::*;

#[utoipa::path(
    get,
    path = "/api/v1/diary/{entry_id}/photos",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    responses(
        (status = 200, description = "List of photos", body = Vec<EntryPhoto>),
    ),
    security(("bearer_auth" = [])),
    tag = "Photos"
)]
pub async fn list_photos(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
) -> Result<response::Ok<Vec<EntryPhoto>>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;
    let photos = EntryPhoto::list_by_entry_id(&db, entry_id).await?;
    Ok(response::Ok(photos))
}

#[utoipa::path(
    post,
    path = "/api/v1/diary/{entry_id}/photos",
    params(("entry_id" = i64, Path, description = "Diary entry ID")),
    request_body = CreatePhotoRequest,
    responses(
        (status = 201, description = "Photo created", body = EntryPhoto),
    ),
    security(("bearer_auth" = [])),
    tag = "Photos"
)]
pub async fn create_photo(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
    Json(req): Json<CreatePhotoRequest>,
) -> Result<response::Created<EntryPhoto>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;

    let photo = EntryPhoto::create(
        &db,
        entry_id,
        &req.url,
        req.caption.as_deref(),
        req.is_primary.unwrap_or(false),
        req.sort_order.unwrap_or(0),
    )
    .await?;

    Ok(response::Created(photo))
}

#[utoipa::path(
    patch,
    path = "/api/v1/diary/{entry_id}/photos/{id}",
    params(
        ("entry_id" = i64, Path, description = "Diary entry ID"),
        ("id" = i64, Path, description = "Photo ID"),
    ),
    request_body = UpdatePhotoRequest,
    responses(
        (status = 200, description = "Photo updated", body = EntryPhoto),
        (status = 404, description = "Not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Photos"
)]
pub async fn update_photo(
    auth: AuthUser,
    Db(db): Db,
    Path((entry_id, photo_id)): Path<(i64, i64)>,
    Json(req): Json<UpdatePhotoRequest>,
) -> Result<response::Ok<EntryPhoto>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;

    EntryPhoto::find_by_id(&db, photo_id, entry_id)
        .await?
        .ok_or_else(|| AppError::NotFound("photo not found".into()))?;

    let photo = EntryPhoto::update(
        &db,
        photo_id,
        entry_id,
        req.caption.as_deref(),
        req.sort_order,
    )
    .await?;

    Ok(response::Ok(photo))
}

#[utoipa::path(
    delete,
    path = "/api/v1/diary/{entry_id}/photos/{id}",
    params(
        ("entry_id" = i64, Path, description = "Diary entry ID"),
        ("id" = i64, Path, description = "Photo ID"),
    ),
    responses(
        (status = 204, description = "Photo deleted"),
        (status = 404, description = "Not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Photos"
)]
pub async fn delete_photo(
    auth: AuthUser,
    Db(db): Db,
    Path((entry_id, photo_id)): Path<(i64, i64)>,
) -> Result<response::NoContent, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;

    EntryPhoto::find_by_id(&db, photo_id, entry_id)
        .await?
        .ok_or_else(|| AppError::NotFound("photo not found".into()))?;

    EntryPhoto::delete(&db, photo_id, entry_id).await?;
    Ok(response::NoContent)
}

#[utoipa::path(
    post,
    path = "/api/v1/diary/{entry_id}/photos/{id}/primary",
    params(
        ("entry_id" = i64, Path, description = "Diary entry ID"),
        ("id" = i64, Path, description = "Photo ID"),
    ),
    responses(
        (status = 200, description = "Primary photo set", body = EntryPhoto),
        (status = 404, description = "Not found", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Photos"
)]
pub async fn set_primary_photo(
    auth: AuthUser,
    Db(db): Db,
    Path((entry_id, photo_id)): Path<(i64, i64)>,
) -> Result<response::Ok<EntryPhoto>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;

    EntryPhoto::find_by_id(&db, photo_id, entry_id)
        .await?
        .ok_or_else(|| AppError::NotFound("photo not found".into()))?;

    let photo = EntryPhoto::set_primary(&db, photo_id, entry_id).await?;
    Ok(response::Ok(photo))
}

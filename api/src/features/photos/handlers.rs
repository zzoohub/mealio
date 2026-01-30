use axum::extract::Path;
use axum::Json;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::features::diary::models::DiaryEntry;
use crate::response;

use super::models::*;

pub async fn list_photos(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
) -> Result<response::Ok<Vec<EntryPhoto>>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;
    let photos = EntryPhoto::list_by_entry_id(&db, entry_id).await?;
    Ok(response::Ok(photos))
}

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

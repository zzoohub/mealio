use axum::extract::{Path, Query};
use axum::Json;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::response;
use crate::shared::types::{Paginated, PaginationParams};

use super::models::*;
use crate::features::nutrition::models::UserNutrition;
use crate::features::photos::models::EntryPhoto;

pub async fn list_entries(
    auth: AuthUser,
    Db(db): Db,
    Query(params): Query<DiaryQueryParams>,
) -> Result<response::Ok<Paginated<DiaryEntry>>, AppError> {
    let (entries, total) = DiaryEntry::list(&db, auth.user_id, &params).await?;

    let pagination = PaginationParams {
        page: params.page,
        per_page: params.per_page,
    };

    Ok(response::Ok(Paginated::new(entries, total, &pagination)))
}

pub async fn create_entry(
    auth: AuthUser,
    Db(db): Db,
    Json(req): Json<CreateEntryRequest>,
) -> Result<response::Created<DiaryEntry>, AppError> {
    let entry = DiaryEntry::create(
        &db,
        auth.user_id,
        &req.meal_type,
        &req.title,
        req.notes.as_deref(),
        req.eaten_at,
    )
    .await?;

    if let Some(loc) = req.location {
        EntryLocation::upsert(
            &db,
            entry.id,
            loc.name.as_deref(),
            loc.latitude,
            loc.longitude,
            loc.address.as_deref(),
        )
        .await?;
    }

    Ok(response::Created(entry))
}

pub async fn get_entry(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
) -> Result<response::Ok<DiaryEntryDetail>, AppError> {
    let entry = DiaryEntry::find_by_id(&db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("diary entry not found".into()))?;

    let location = EntryLocation::find_by_entry_id(&db, entry.id).await?;
    let photos = EntryPhoto::list_by_entry_id(&db, entry.id).await?;
    let nutrition = UserNutrition::find_by_entry_id(&db, entry.id).await?;

    Ok(response::Ok(DiaryEntryDetail {
        entry,
        location,
        photos,
        nutrition,
    }))
}

pub async fn update_entry(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
    Json(req): Json<UpdateEntryRequest>,
) -> Result<response::Ok<DiaryEntry>, AppError> {
    // Verify ownership
    DiaryEntry::find_by_id(&db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("diary entry not found".into()))?;

    let entry = DiaryEntry::update(
        &db,
        id,
        auth.user_id,
        req.meal_type.as_ref(),
        req.title.as_deref(),
        req.notes.as_deref(),
        req.eaten_at,
    )
    .await?;

    Ok(response::Ok(entry))
}

pub async fn delete_entry(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
) -> Result<response::NoContent, AppError> {
    DiaryEntry::find_by_id(&db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("diary entry not found".into()))?;

    DiaryEntry::soft_delete(&db, id, auth.user_id).await?;
    Ok(response::NoContent)
}

pub async fn get_location(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
) -> Result<response::Ok<EntryLocation>, AppError> {
    DiaryEntry::find_by_id(&db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("diary entry not found".into()))?;

    let location = EntryLocation::find_by_entry_id(&db, id)
        .await?
        .ok_or_else(|| AppError::NotFound("location not found".into()))?;

    Ok(response::Ok(location))
}

pub async fn upsert_location(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
    Json(req): Json<UpsertLocationRequest>,
) -> Result<response::Ok<EntryLocation>, AppError> {
    DiaryEntry::find_by_id(&db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("diary entry not found".into()))?;

    let location = EntryLocation::upsert(
        &db,
        id,
        req.name.as_deref(),
        req.latitude,
        req.longitude,
        req.address.as_deref(),
    )
    .await?;

    Ok(response::Ok(location))
}

pub async fn delete_location(
    auth: AuthUser,
    Db(db): Db,
    Path(id): Path<i64>,
) -> Result<response::NoContent, AppError> {
    DiaryEntry::find_by_id(&db, id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("diary entry not found".into()))?;

    EntryLocation::delete_by_entry_id(&db, id).await?;
    Ok(response::NoContent)
}

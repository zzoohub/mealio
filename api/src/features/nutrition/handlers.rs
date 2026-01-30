use axum::extract::Path;
use axum::Json;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::features::diary::models::DiaryEntry;
use crate::response;

use super::models::*;

pub async fn get_nutrition(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
) -> Result<response::Ok<UserNutrition>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;

    let nutrition = UserNutrition::find_by_entry_id(&db, entry_id)
        .await?
        .ok_or_else(|| AppError::NotFound("nutrition data not found".into()))?;

    Ok(response::Ok(nutrition))
}

pub async fn upsert_nutrition(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
    Json(req): Json<UpsertNutritionRequest>,
) -> Result<response::Ok<UserNutrition>, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;

    let nutrition = UserNutrition::upsert(&db, entry_id, &req).await?;
    Ok(response::Ok(nutrition))
}

pub async fn delete_nutrition(
    auth: AuthUser,
    Db(db): Db,
    Path(entry_id): Path<i64>,
) -> Result<response::NoContent, AppError> {
    DiaryEntry::verify_ownership(&db, entry_id, auth.user_id).await?;
    UserNutrition::delete_by_entry_id(&db, entry_id).await?;
    Ok(response::NoContent)
}

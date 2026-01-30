use axum::Json;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::features::auth::models::AuthToken;
use crate::response;

use super::models::*;

pub async fn get_me(
    auth: AuthUser,
    Db(db): Db,
) -> Result<response::Ok<User>, AppError> {
    let user = User::find_by_id(&db, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("user not found".into()))?;
    Ok(response::Ok(user))
}

pub async fn update_me(
    auth: AuthUser,
    Db(db): Db,
    Json(req): Json<UpdateUserRequest>,
) -> Result<response::Ok<User>, AppError> {
    let user = User::update(
        &db,
        auth.user_id,
        req.display_name.as_deref(),
        req.photo_url.as_deref(),
    )
    .await?;
    Ok(response::Ok(user))
}

pub async fn delete_me(
    auth: AuthUser,
    Db(db): Db,
) -> Result<response::NoContent, AppError> {
    // Revoke all tokens before soft-deleting user
    let mut tx = db.begin().await?;
    AuthToken::revoke_all_for_user(&mut *tx, auth.user_id).await?;
    User::soft_delete(&mut *tx, auth.user_id).await?;
    tx.commit().await?;
    Ok(response::NoContent)
}

pub async fn get_settings(
    auth: AuthUser,
    Db(db): Db,
) -> Result<response::Ok<UserSettings>, AppError> {
    let settings = UserSettings::find_by_user_id(&db, auth.user_id).await?;
    Ok(response::Ok(settings))
}

pub async fn update_settings(
    auth: AuthUser,
    Db(db): Db,
    Json(req): Json<UpdateSettingsRequest>,
) -> Result<response::Ok<UserSettings>, AppError> {
    let settings = UserSettings::update(
        &db,
        auth.user_id,
        req.theme.as_deref(),
        req.language.as_deref(),
        req.notifications_enabled,
        req.privacy_profile_public,
    )
    .await?;
    Ok(response::Ok(settings))
}

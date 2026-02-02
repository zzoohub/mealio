use axum::extract::State;
use axum::Json;
use chrono::{Duration, Utc};
use uuid::Uuid;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::response;
use crate::AppState;

use super::jwt;
use super::models::*;
use super::oauth;
use crate::features::users::models::User;

#[utoipa::path(
    post,
    path = "/api/v1/auth/sign-in",
    request_body = SignInRequest,
    responses(
        (status = 201, description = "Sign in successful", body = AuthResponse),
        (status = 400, description = "Bad request", body = crate::error::ProblemDetail),
    ),
    tag = "Auth"
)]
pub async fn sign_in(
    State(state): State<AppState>,
    Db(db): Db,
    Json(req): Json<SignInRequest>,
) -> Result<response::Created<AuthResponse>, AppError> {
    let oauth_user = match req.provider.as_str() {
        "google" => oauth::verify_google_token(&req.id_token, &state.google_client_id).await?,
        "apple" => {
            oauth::verify_apple_token(&req.id_token, &state.apple_team_id, &state.apple_bundle_id)
                .await?
        }
        _ => return Err(AppError::BadRequest("unsupported provider".into())),
    };

    // Wrap find-or-create in a transaction to prevent duplicate users
    let mut tx = db.begin().await?;

    let user = match UserAuthProvider::find_by_provider(&mut *tx, &req.provider, &oauth_user.provider_uid).await? {
        Some(auth_provider) => {
            User::find_by_id(&mut *tx, auth_provider.user_id)
                .await?
                .ok_or_else(|| AppError::Internal("user not found for auth provider".into()))?
        }
        None => {
            let user = User::create(
                &mut *tx,
                &oauth_user.name,
                &oauth_user.email,
                oauth_user.photo_url.as_deref(),
            )
            .await?;

            UserAuthProvider::create(&mut *tx, user.id, &req.provider, &oauth_user.provider_uid)
                .await?;

            user
        }
    };

    let (access_token, expires_in) = jwt::create_access_token(user.id, &state.jwt_secret)
        .map_err(|e| AppError::Internal(format!("failed to create token: {e}")))?;

    let refresh_token = Uuid::new_v4().to_string();
    let token_hash = jwt::hash_token(&refresh_token);

    AuthToken::create(
        &mut *tx,
        user.id,
        &token_hash,
        req.device_info.as_deref(),
        Utc::now() + Duration::days(30),
    )
    .await?;

    tx.commit().await?;

    Ok(response::Created(AuthResponse {
        access_token,
        refresh_token,
        expires_in,
        user: UserInfo {
            id: user.id,
            display_name: user.display_name,
            email: user.email,
            photo_url: user.photo_url,
        },
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/refresh",
    request_body = RefreshRequest,
    responses(
        (status = 200, description = "Token refreshed", body = RefreshResponse),
        (status = 401, description = "Invalid refresh token", body = crate::error::ProblemDetail),
    ),
    tag = "Auth"
)]
pub async fn refresh(
    State(state): State<AppState>,
    Db(db): Db,
    Json(req): Json<RefreshRequest>,
) -> Result<response::Ok<RefreshResponse>, AppError> {
    let token_hash = jwt::hash_token(&req.refresh_token);

    let auth_token = AuthToken::find_by_hash(&db, &token_hash)
        .await?
        .ok_or_else(|| AppError::Unauthorized("invalid or expired refresh token".into()))?;

    // Verify user is still active
    User::find_by_id(&db, auth_token.user_id)
        .await?
        .ok_or_else(|| AppError::Unauthorized("user account is deactivated".into()))?;

    // Rotate: revoke old token, issue new one
    let mut tx = db.begin().await?;

    AuthToken::revoke(&mut *tx, &token_hash).await?;

    let new_refresh_token = Uuid::new_v4().to_string();
    let new_token_hash = jwt::hash_token(&new_refresh_token);

    AuthToken::create(
        &mut *tx,
        auth_token.user_id,
        &new_token_hash,
        None,
        Utc::now() + Duration::days(30),
    )
    .await?;

    tx.commit().await?;

    let (access_token, expires_in) =
        jwt::create_access_token(auth_token.user_id, &state.jwt_secret)
            .map_err(|e| AppError::Internal(format!("failed to create token: {e}")))?;

    Ok(response::Ok(RefreshResponse {
        access_token,
        refresh_token: new_refresh_token,
        expires_in,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/revoke",
    request_body = RevokeRequest,
    responses(
        (status = 204, description = "Token revoked"),
        (status = 401, description = "Unauthorized", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Auth"
)]
pub async fn revoke(
    auth: AuthUser,
    Db(db): Db,
    Json(req): Json<RevokeRequest>,
) -> Result<response::NoContent, AppError> {
    let token_hash = jwt::hash_token(&req.refresh_token);

    // Verify the token belongs to the authenticated user
    let auth_token = AuthToken::find_by_hash(&db, &token_hash)
        .await?
        .ok_or_else(|| AppError::Unauthorized("invalid refresh token".into()))?;

    if auth_token.user_id != auth.user_id {
        return Err(AppError::Unauthorized("token does not belong to user".into()));
    }

    AuthToken::revoke(&db, &token_hash).await?;
    Ok(response::NoContent)
}

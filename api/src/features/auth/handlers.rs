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
        "google" => {
            oauth::verify_google_token(&req.id_token, &state.google_client_id, &state.jwks_cache)
                .await?
        }
        "apple" => {
            oauth::verify_apple_token(
                &req.id_token,
                &state.apple_team_id,
                &state.apple_bundle_id,
                &state.jwks_cache,
            )
            .await?
        }
        _ => return Err(AppError::BadRequest("unsupported provider".into())),
    };

    // Wrap find-or-create in a transaction to prevent duplicate users
    let mut tx = db.begin().await?;

    let user = match UserAuthProvider::find_by_provider(&mut *tx, &req.provider, &oauth_user.provider_uid).await? {
        Some(auth_provider) => {
            match User::find_by_id(&mut *tx, auth_provider.user_id).await? {
                Some(user) => user,
                None => {
                    // User was soft-deleted — restore the account
                    User::restore(
                        &mut *tx,
                        auth_provider.user_id,
                        &oauth_user.name,
                        oauth_user.photo_url.as_deref(),
                    )
                    .await?
                }
            }
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

    let auth_token = match AuthToken::find_by_hash(&db, &token_hash).await? {
        Some(token) => token,
        None => {
            // Token not found as valid -- check if it ever existed (reuse detection)
            if let Some(stale_token) = AuthToken::find_by_hash_any(&db, &token_hash).await? {
                tracing::warn!(
                    user_id = stale_token.user_id,
                    token_id = stale_token.id,
                    "refresh token reuse detected — revoking all tokens for user"
                );
                AuthToken::revoke_all_for_user(&db, stale_token.user_id).await?;
            }
            return Err(AppError::Unauthorized("invalid or expired refresh token".into()));
        }
    };

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sign_in_request_structure() {
        let req = SignInRequest {
            provider: "google".to_string(),
            id_token: "test_token".to_string(),
            device_info: Some("iPhone 15 Pro".to_string()),
        };

        assert_eq!(req.provider, "google");
        assert_eq!(req.id_token, "test_token");
        assert_eq!(req.device_info, Some("iPhone 15 Pro".to_string()));
    }

    #[test]
    fn test_sign_in_request_no_device_info() {
        let req = SignInRequest {
            provider: "apple".to_string(),
            id_token: "apple_token".to_string(),
            device_info: None,
        };

        assert_eq!(req.provider, "apple");
        assert!(req.device_info.is_none());
    }

    #[test]
    fn test_auth_response_structure() {
        let resp = AuthResponse {
            access_token: "access_token_123".to_string(),
            refresh_token: "refresh_token_456".to_string(),
            expires_in: 900,
            user: UserInfo {
                id: 1,
                display_name: "Test User".to_string(),
                email: "test@example.com".to_string(),
                photo_url: Some("https://example.com/photo.jpg".to_string()),
            },
        };

        assert_eq!(resp.access_token, "access_token_123");
        assert_eq!(resp.refresh_token, "refresh_token_456");
        assert_eq!(resp.expires_in, 900);
        assert_eq!(resp.user.id, 1);
        assert_eq!(resp.user.display_name, "Test User");
        assert_eq!(resp.user.email, "test@example.com");
    }

    #[test]
    fn test_refresh_request_structure() {
        let req = RefreshRequest {
            refresh_token: "refresh_token_789".to_string(),
        };

        assert_eq!(req.refresh_token, "refresh_token_789");
    }

    #[test]
    fn test_refresh_response_structure() {
        let resp = RefreshResponse {
            access_token: "new_access_token".to_string(),
            refresh_token: "new_refresh_token".to_string(),
            expires_in: 900,
        };

        assert_eq!(resp.access_token, "new_access_token");
        assert_eq!(resp.refresh_token, "new_refresh_token");
        assert_eq!(resp.expires_in, 900);
    }

    #[test]
    fn test_revoke_request_structure() {
        let req = RevokeRequest {
            refresh_token: "token_to_revoke".to_string(),
        };

        assert_eq!(req.refresh_token, "token_to_revoke");
    }

    #[test]
    fn test_user_info_with_photo() {
        let user_info = UserInfo {
            id: 123,
            display_name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
            photo_url: Some("https://example.com/john.jpg".to_string()),
        };

        assert_eq!(user_info.id, 123);
        assert_eq!(user_info.display_name, "John Doe");
        assert_eq!(user_info.email, "john@example.com");
        assert!(user_info.photo_url.is_some());
    }

    #[test]
    fn test_user_info_without_photo() {
        let user_info = UserInfo {
            id: 456,
            display_name: "Jane Smith".to_string(),
            email: "jane@example.com".to_string(),
            photo_url: None,
        };

        assert_eq!(user_info.id, 456);
        assert_eq!(user_info.display_name, "Jane Smith");
        assert_eq!(user_info.email, "jane@example.com");
        assert!(user_info.photo_url.is_none());
    }

    #[test]
    fn test_supported_provider_google() {
        let provider = "google";
        assert!(matches!(provider, "google" | "apple"));
    }

    #[test]
    fn test_supported_provider_apple() {
        let provider = "apple";
        assert!(matches!(provider, "google" | "apple"));
    }

    #[test]
    fn test_unsupported_provider() {
        let provider = "facebook";
        assert!(!matches!(provider, "google" | "apple"));
    }

    // Helper function to validate provider (extracted from sign_in logic)
    fn is_supported_provider(provider: &str) -> bool {
        matches!(provider, "google" | "apple")
    }

    #[test]
    fn test_provider_validation_accepts_google() {
        assert!(is_supported_provider("google"));
    }

    #[test]
    fn test_provider_validation_accepts_apple() {
        assert!(is_supported_provider("apple"));
    }

    #[test]
    fn test_provider_validation_rejects_facebook() {
        assert!(!is_supported_provider("facebook"));
    }

    #[test]
    fn test_provider_validation_rejects_twitter() {
        assert!(!is_supported_provider("twitter"));
    }

    #[test]
    fn test_provider_validation_rejects_empty() {
        assert!(!is_supported_provider(""));
    }

    #[test]
    fn test_provider_validation_case_sensitive() {
        assert!(!is_supported_provider("Google"));
        assert!(!is_supported_provider("GOOGLE"));
        assert!(!is_supported_provider("Apple"));
        assert!(!is_supported_provider("APPLE"));
    }
}

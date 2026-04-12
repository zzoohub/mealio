use axum::extract::State;
use axum::Json;

use crate::error::AppError;
use crate::extractors::{AuthUser, Db};
use crate::features::photos::models::EntryPhoto;
use crate::response;
use crate::AppState;

use super::models::*;

#[utoipa::path(
    get,
    path = "/api/v1/users/me",
    responses(
        (status = 200, description = "Current user profile", body = User),
        (status = 401, description = "Unauthorized", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Users"
)]
pub async fn get_me(
    auth: AuthUser,
    Db(db): Db,
) -> Result<response::Ok<User>, AppError> {
    let user = User::find_by_id(&db, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("user not found".into()))?;
    Ok(response::Ok(user))
}

#[utoipa::path(
    patch,
    path = "/api/v1/users/me",
    request_body = UpdateUserRequest,
    responses(
        (status = 200, description = "Updated user profile", body = User),
        (status = 401, description = "Unauthorized", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Users"
)]
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

#[utoipa::path(
    delete,
    path = "/api/v1/users/me",
    responses(
        (status = 204, description = "User deleted"),
        (status = 401, description = "Unauthorized", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Users"
)]
pub async fn delete_me(
    auth: AuthUser,
    Db(db): Db,
    State(state): State<AppState>,
) -> Result<response::NoContent, AppError> {
    // 1. Collect all photo URLs for this user
    let photo_urls = EntryPhoto::list_urls_by_user_id(&db, auth.user_id).await?;

    // 2. Best-effort R2 cleanup — delete photo objects in parallel
    if !photo_urls.is_empty() && !state.r2_public_url.is_empty() {
        let r2_public_prefix = crate::shared::storage::r2_public_prefix(&state.r2_public_url);
        let expected_key_prefix = format!("photos/{}/", auth.user_id);
        let mut join_set = tokio::task::JoinSet::new();

        for url in &photo_urls {
            if let Some(key) = url.strip_prefix(&r2_public_prefix) {
                if !key.starts_with(&expected_key_prefix) {
                    tracing::warn!(url = %url, user_id = auth.user_id, "skipping R2 deletion: key not in user's directory");
                    continue;
                }
                let client = state.s3_client.clone();
                let bucket = state.r2_bucket.clone();
                let key = key.to_string();
                let url = url.clone();
                join_set.spawn(async move {
                    let result = client.delete_object().bucket(&bucket).key(&key).send().await;
                    (url, result)
                });
            }
        }

        while let Some(res) = join_set.join_next().await {
            if let Ok((url, Err(e))) = res {
                tracing::warn!(url = %url, error = %e, "failed to delete R2 object");
            }
        }
    } else if !photo_urls.is_empty() {
        tracing::warn!(user_id = auth.user_id, "R2_PUBLIC_URL not configured — skipping R2 photo cleanup");
    }

    // 3. Hard delete user (CASCADE removes all child rows)
    tracing::info!(
        user_id = auth.user_id,
        photo_count = photo_urls.len(),
        event = "account.hard_delete",
        "user account permanently deleted"
    );
    User::hard_delete(&db, auth.user_id).await?;

    Ok(response::NoContent)
}

#[utoipa::path(
    get,
    path = "/api/v1/users/me/settings",
    responses(
        (status = 200, description = "User settings", body = UserSettings),
        (status = 401, description = "Unauthorized", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Users"
)]
pub async fn get_settings(
    auth: AuthUser,
    Db(db): Db,
) -> Result<response::Ok<UserSettings>, AppError> {
    let settings = UserSettings::find_by_user_id(&db, auth.user_id).await?;
    Ok(response::Ok(settings))
}

#[utoipa::path(
    patch,
    path = "/api/v1/users/me/settings",
    request_body = UpdateSettingsRequest,
    responses(
        (status = 200, description = "Updated settings", body = UserSettings),
        (status = 401, description = "Unauthorized", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Users"
)]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_user_request_as_deref_display_name() {
        let req = UpdateUserRequest {
            display_name: Some("New Name".to_string()),
            photo_url: None,
        };

        let name = req.display_name.as_deref();
        assert_eq!(name, Some("New Name"));
    }

    #[test]
    fn test_update_user_request_as_deref_none() {
        let req = UpdateUserRequest {
            display_name: None,
            photo_url: None,
        };

        let name = req.display_name.as_deref();
        assert_eq!(name, None);
    }

    #[test]
    fn test_update_user_request_photo_url_as_deref() {
        let req = UpdateUserRequest {
            display_name: None,
            photo_url: Some("https://example.com/photo.jpg".to_string()),
        };

        let photo = req.photo_url.as_deref();
        assert_eq!(photo, Some("https://example.com/photo.jpg"));
    }

    #[test]
    fn test_update_settings_request_as_deref_theme() {
        let req = UpdateSettingsRequest {
            theme: Some("dark".to_string()),
            language: None,
            notifications_enabled: None,
            privacy_profile_public: None,
        };

        let theme = req.theme.as_deref();
        assert_eq!(theme, Some("dark"));
    }

    #[test]
    fn test_update_settings_request_as_deref_language() {
        let req = UpdateSettingsRequest {
            theme: None,
            language: Some("ko".to_string()),
            notifications_enabled: None,
            privacy_profile_public: None,
        };

        let lang = req.language.as_deref();
        assert_eq!(lang, Some("ko"));
    }

    #[test]
    fn test_update_settings_request_boolean_fields() {
        let req = UpdateSettingsRequest {
            theme: None,
            language: None,
            notifications_enabled: Some(true),
            privacy_profile_public: Some(false),
        };

        assert_eq!(req.notifications_enabled, Some(true));
        assert_eq!(req.privacy_profile_public, Some(false));
    }

    #[test]
    fn test_update_settings_request_all_none() {
        let req = UpdateSettingsRequest {
            theme: None,
            language: None,
            notifications_enabled: None,
            privacy_profile_public: None,
        };

        assert!(req.theme.is_none());
        assert!(req.language.is_none());
        assert!(req.notifications_enabled.is_none());
        assert!(req.privacy_profile_public.is_none());
    }

    #[test]
    fn test_update_settings_theme_variants() {
        let themes = vec!["light", "dark", "auto"];

        for theme in themes {
            let req = UpdateSettingsRequest {
                theme: Some(theme.to_string()),
                language: None,
                notifications_enabled: None,
                privacy_profile_public: None,
            };
            assert_eq!(req.theme.as_deref(), Some(theme));
        }
    }

    #[test]
    fn test_update_settings_language_variants() {
        let languages = vec!["en", "ko", "ja", "zh"];

        for lang in languages {
            let req = UpdateSettingsRequest {
                theme: None,
                language: Some(lang.to_string()),
                notifications_enabled: None,
                privacy_profile_public: None,
            };
            assert_eq!(req.language.as_deref(), Some(lang));
        }
    }

    #[test]
    fn test_update_settings_notifications_enabled_true() {
        let req = UpdateSettingsRequest {
            theme: None,
            language: None,
            notifications_enabled: Some(true),
            privacy_profile_public: None,
        };

        assert_eq!(req.notifications_enabled, Some(true));
    }

    #[test]
    fn test_update_settings_notifications_enabled_false() {
        let req = UpdateSettingsRequest {
            theme: None,
            language: None,
            notifications_enabled: Some(false),
            privacy_profile_public: None,
        };

        assert_eq!(req.notifications_enabled, Some(false));
    }

    #[test]
    fn test_update_settings_privacy_public_true() {
        let req = UpdateSettingsRequest {
            theme: None,
            language: None,
            notifications_enabled: None,
            privacy_profile_public: Some(true),
        };

        assert_eq!(req.privacy_profile_public, Some(true));
    }

    #[test]
    fn test_update_settings_privacy_public_false() {
        let req = UpdateSettingsRequest {
            theme: None,
            language: None,
            notifications_enabled: None,
            privacy_profile_public: Some(false),
        };

        assert_eq!(req.privacy_profile_public, Some(false));
    }

    #[test]
    fn test_update_user_request_empty_strings() {
        let req = UpdateUserRequest {
            display_name: Some("".to_string()),
            photo_url: Some("".to_string()),
        };

        assert_eq!(req.display_name.as_deref(), Some(""));
        assert_eq!(req.photo_url.as_deref(), Some(""));
    }

    #[test]
    fn test_update_settings_request_empty_strings() {
        let req = UpdateSettingsRequest {
            theme: Some("".to_string()),
            language: Some("".to_string()),
            notifications_enabled: None,
            privacy_profile_public: None,
        };

        assert_eq!(req.theme.as_deref(), Some(""));
        assert_eq!(req.language.as_deref(), Some(""));
    }
}

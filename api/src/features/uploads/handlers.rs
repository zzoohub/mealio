use std::time::Duration;

use axum::extract::State;
use axum::Json;

use crate::error::AppError;
use crate::extractors::AuthUser;
use crate::response;
use crate::AppState;

use super::models::*;

const PRESIGN_EXPIRY_SECS: u32 = 900; // 15 minutes

const ALLOWED_CONTENT_TYPES: &[&str] = &[
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
];

fn extension_for_content_type(content_type: &str) -> Option<&'static str> {
    match content_type {
        "image/jpeg" => Some("jpg"),
        "image/png" => Some("png"),
        "image/webp" => Some("webp"),
        "image/heic" => Some("heic"),
        _ => None,
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/uploads/presign",
    request_body = PresignRequest,
    responses(
        (status = 200, description = "Presigned upload URL", body = PresignResponse),
        (status = 400, description = "Invalid content type", body = crate::error::ProblemDetail),
    ),
    security(("bearer_auth" = [])),
    tag = "Uploads"
)]
pub async fn presign(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<PresignRequest>,
) -> Result<response::Ok<PresignResponse>, AppError> {
    let ext = extension_for_content_type(&req.content_type).ok_or_else(|| {
        AppError::BadRequest(format!(
            "Unsupported content type. Allowed: {}",
            ALLOWED_CONTENT_TYPES.join(", ")
        ))
    })?;

    let object_key = format!(
        "photos/{}/{}.{}",
        auth.user_id,
        uuid::Uuid::new_v4(),
        ext
    );

    let presigned = state
        .s3_client
        .put_object()
        .bucket(&state.r2_bucket)
        .key(&object_key)
        .content_type(&req.content_type)
        .presigned(
            aws_sdk_s3::presigning::PresigningConfig::builder()
                .expires_in(Duration::from_secs(PRESIGN_EXPIRY_SECS.into()))
                .build()
                .map_err(|e| AppError::Internal(format!("presign config error: {e}")))?,
        )
        .await
        .map_err(|e| AppError::Internal(format!("presign error: {e}")))?;

    let public_url = if state.r2_public_url.is_empty() {
        object_key.clone()
    } else {
        format!("{}/{}", state.r2_public_url.trim_end_matches('/'), object_key)
    };

    Ok(response::Ok(PresignResponse {
        upload_url: presigned.uri().to_string(),
        object_key,
        public_url,
        expires_in: PRESIGN_EXPIRY_SECS,
    }))
}

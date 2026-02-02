use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),

    #[error("unauthorized: {0}")]
    Unauthorized(String),

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("internal error: {0}")]
    Internal(String),
}

#[derive(Serialize, utoipa::ToSchema)]
pub struct ProblemDetail {
    r#type: &'static str,
    title: String,
    status: u16,
    detail: String,
}

impl AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::Conflict(_) => StatusCode::CONFLICT,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let problem = ProblemDetail {
            r#type: "about:blank",
            title: status.canonical_reason().unwrap_or("Error").to_string(),
            status: status.as_u16(),
            detail: self.to_string(),
        };

        let mut response = axum::Json(problem).into_response();
        *response.status_mut() = status;
        response
            .headers_mut()
            .insert("content-type", "application/problem+json".parse().unwrap());
        response
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => AppError::NotFound("resource not found".into()),
            sqlx::Error::Database(ref db_err) => match db_err.code().as_deref() {
                Some("23505") => AppError::Conflict("resource already exists".into()),
                Some("23503") => {
                    AppError::BadRequest("referenced resource does not exist".into())
                }
                Some("23502") => AppError::BadRequest("missing required field".into()),
                Some("23514") => AppError::BadRequest("constraint violation".into()),
                _ => {
                    tracing::error!("database error: {err}");
                    AppError::Internal("database error".into())
                }
            },
            _ => {
                tracing::error!("database error: {err}");
                AppError::Internal("database error".into())
            }
        }
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        tracing::warn!("jwt error: {err}");
        AppError::Unauthorized("invalid token".into())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        tracing::error!("http client error: {err}");
        AppError::Internal("external service error".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;

    #[test]
    fn test_app_error_status_codes() {
        assert_eq!(
            AppError::NotFound("test".into()).status_code(),
            StatusCode::NOT_FOUND
        );
        assert_eq!(
            AppError::Unauthorized("test".into()).status_code(),
            StatusCode::UNAUTHORIZED
        );
        assert_eq!(
            AppError::BadRequest("test".into()).status_code(),
            StatusCode::BAD_REQUEST
        );
        assert_eq!(
            AppError::Conflict("test".into()).status_code(),
            StatusCode::CONFLICT
        );
        assert_eq!(
            AppError::Internal("test".into()).status_code(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }

    #[test]
    fn test_app_error_display() {
        assert_eq!(
            AppError::NotFound("user".into()).to_string(),
            "not found: user"
        );
        assert_eq!(
            AppError::Unauthorized("invalid token".into()).to_string(),
            "unauthorized: invalid token"
        );
        assert_eq!(
            AppError::BadRequest("missing field".into()).to_string(),
            "bad request: missing field"
        );
        assert_eq!(
            AppError::Conflict("already exists".into()).to_string(),
            "conflict: already exists"
        );
        assert_eq!(
            AppError::Internal("database error".into()).to_string(),
            "internal error: database error"
        );
    }

    #[tokio::test]
    async fn test_app_error_into_response() {
        let error = AppError::NotFound("resource not found".into());
        let response = error.into_response();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let content_type = response.headers().get("content-type").unwrap();
        assert_eq!(content_type, "application/problem+json");
    }

    #[tokio::test]
    async fn test_app_error_response_body_structure() {
        use axum::body::to_bytes;

        let error = AppError::BadRequest("invalid input".into());
        let response = error.into_response();

        let body_bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();

        assert_eq!(json["type"], "about:blank");
        assert_eq!(json["title"], "Bad Request");
        assert_eq!(json["status"], 400);
        assert_eq!(json["detail"], "bad request: invalid input");
    }

    #[test]
    fn test_jwt_error_conversion() {
        use jsonwebtoken::errors::{Error as JwtError, ErrorKind};

        let jwt_err = JwtError::from(ErrorKind::InvalidToken);
        let app_err: AppError = jwt_err.into();

        match app_err {
            AppError::Unauthorized(msg) => assert_eq!(msg, "invalid token"),
            _ => panic!("Expected Unauthorized error"),
        }
    }

    #[tokio::test]
    async fn test_reqwest_error_conversion() {
        // Create a mock reqwest error (URL parse error)
        let reqwest_err = reqwest::get("not a valid url").await.unwrap_err();
        let app_err: AppError = reqwest_err.into();

        match app_err {
            AppError::Internal(msg) => assert_eq!(msg, "external service error"),
            _ => panic!("Expected Internal error"),
        }
    }
}

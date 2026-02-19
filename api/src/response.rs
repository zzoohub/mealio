use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

/// 200 OK with JSON body
pub struct Ok<T>(pub T);

impl<T: Serialize> IntoResponse for Ok<T> {
    fn into_response(self) -> Response {
        (StatusCode::OK, axum::Json(self.0)).into_response()
    }
}

/// 201 Created with JSON body
pub struct Created<T>(pub T);

impl<T: Serialize> IntoResponse for Created<T> {
    fn into_response(self) -> Response {
        (StatusCode::CREATED, axum::Json(self.0)).into_response()
    }
}

/// 202 Accepted with JSON body
pub struct Accepted<T>(pub T);

impl<T: Serialize> IntoResponse for Accepted<T> {
    fn into_response(self) -> Response {
        (StatusCode::ACCEPTED, axum::Json(self.0)).into_response()
    }
}

/// 204 No Content
pub struct NoContent;

impl IntoResponse for NoContent {
    fn into_response(self) -> Response {
        StatusCode::NO_CONTENT.into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;
    use serde::Deserialize;

    #[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
    struct TestData {
        id: i32,
        name: String,
    }

    #[tokio::test]
    async fn test_ok_response_status() {
        let data = TestData {
            id: 1,
            name: "test".to_string(),
        };
        let response = Ok(data).into_response();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_ok_response_body() {
        let data = TestData {
            id: 42,
            name: "example".to_string(),
        };
        let response = Ok(data.clone()).into_response();

        let body_bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let body_data: TestData = serde_json::from_slice(&body_bytes).unwrap();

        assert_eq!(body_data, data);
    }

    #[tokio::test]
    async fn test_ok_response_content_type() {
        let data = TestData {
            id: 1,
            name: "test".to_string(),
        };
        let response = Ok(data).into_response();

        let content_type = response.headers().get("content-type").unwrap();
        assert_eq!(content_type, "application/json");
    }

    #[tokio::test]
    async fn test_created_response_status() {
        let data = TestData {
            id: 1,
            name: "new".to_string(),
        };
        let response = Created(data).into_response();

        assert_eq!(response.status(), StatusCode::CREATED);
    }

    #[tokio::test]
    async fn test_created_response_body() {
        let data = TestData {
            id: 99,
            name: "created".to_string(),
        };
        let response = Created(data.clone()).into_response();

        let body_bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let body_data: TestData = serde_json::from_slice(&body_bytes).unwrap();

        assert_eq!(body_data, data);
    }

    #[tokio::test]
    async fn test_created_response_content_type() {
        let data = TestData {
            id: 1,
            name: "test".to_string(),
        };
        let response = Created(data).into_response();

        let content_type = response.headers().get("content-type").unwrap();
        assert_eq!(content_type, "application/json");
    }

    #[tokio::test]
    async fn test_no_content_response_status() {
        let response = NoContent.into_response();
        assert_eq!(response.status(), StatusCode::NO_CONTENT);
    }

    #[tokio::test]
    async fn test_no_content_response_empty_body() {
        let response = NoContent.into_response();
        let body_bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        assert!(body_bytes.is_empty());
    }
}

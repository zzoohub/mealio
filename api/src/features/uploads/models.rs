use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct PresignRequest {
    /// MIME type: image/jpeg, image/png, image/webp, image/heic
    pub content_type: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct PresignResponse {
    /// Presigned PUT URL for direct upload to R2
    pub upload_url: String,
    /// Object key in the bucket (e.g. "photos/123/uuid.jpg")
    pub object_key: String,
    /// Public URL to access the uploaded file
    pub public_url: String,
    /// Seconds until the presigned URL expires
    pub expires_in: u32,
}

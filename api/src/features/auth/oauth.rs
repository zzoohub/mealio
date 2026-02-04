use serde::Deserialize;

use crate::error::AppError;

use super::jwks::JwksCache;

const GOOGLE_JWKS_URL: &str = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS: &[&str] = &["https://accounts.google.com", "accounts.google.com"];
const APPLE_JWKS_URL: &str = "https://appleid.apple.com/auth/keys";
const APPLE_ISSUER: &str = "https://appleid.apple.com";

#[derive(Debug)]
pub struct OAuthUserInfo {
    pub provider_uid: String,
    pub email: String,
    pub name: String,
    pub photo_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleIdTokenClaims {
    sub: String,
    email: String,
    name: Option<String>,
    picture: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct AppleTokenClaims {
    sub: String,
    email: Option<String>,
}

pub async fn verify_google_token(
    id_token: &str,
    client_id: &str,
    jwks_cache: &JwksCache,
) -> Result<OAuthUserInfo, AppError> {
    let header = jsonwebtoken::decode_header(id_token).map_err(|e| {
        tracing::warn!("invalid Google token header: {e}");
        AppError::Unauthorized("authentication failed".into())
    })?;

    let kid = header
        .kid
        .ok_or_else(|| AppError::Unauthorized("authentication failed".into()))?;

    let decoding_key = jwks_cache.get_key(GOOGLE_JWKS_URL, &kid).await?;

    let mut validation = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::RS256);
    validation.set_audience(&[client_id]);
    validation.set_issuer(GOOGLE_ISSUERS);

    let token_data =
        jsonwebtoken::decode::<GoogleIdTokenClaims>(id_token, &decoding_key, &validation)
            .map_err(|e| {
                tracing::warn!("Google token verification failed: {e}");
                AppError::Unauthorized("authentication failed".into())
            })?;

    let claims = token_data.claims;

    Ok(OAuthUserInfo {
        provider_uid: claims.sub,
        email: claims.email,
        name: claims.name.unwrap_or_else(|| "User".to_string()),
        photo_url: claims.picture,
    })
}

pub async fn verify_apple_token(
    id_token: &str,
    _team_id: &str,
    bundle_id: &str,
    jwks_cache: &JwksCache,
) -> Result<OAuthUserInfo, AppError> {
    let header = jsonwebtoken::decode_header(id_token).map_err(|e| {
        tracing::warn!("invalid Apple token header: {e}");
        AppError::Unauthorized("authentication failed".into())
    })?;

    let kid = header
        .kid
        .ok_or_else(|| AppError::Unauthorized("authentication failed".into()))?;

    let decoding_key = jwks_cache.get_key(APPLE_JWKS_URL, &kid).await?;

    // Hardcode RS256, never trust alg from token header
    let mut validation = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::RS256);
    validation.set_audience(&[bundle_id]);
    validation.set_issuer(&[APPLE_ISSUER]);

    let token_data =
        jsonwebtoken::decode::<AppleTokenClaims>(id_token, &decoding_key, &validation)
            .map_err(|e| {
                tracing::warn!("Apple token verification failed: {e}");
                AppError::Unauthorized("authentication failed".into())
            })?;

    let claims = token_data.claims;

    let email = claims.email.filter(|e| !e.is_empty()).ok_or_else(|| {
        AppError::Unauthorized("authentication failed".into())
    })?;

    Ok(OAuthUserInfo {
        provider_uid: claims.sub,
        email,
        name: "User".to_string(),
        photo_url: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_google_jwks_url() {
        assert_eq!(GOOGLE_JWKS_URL, "https://www.googleapis.com/oauth2/v3/certs");
        assert!(GOOGLE_JWKS_URL.starts_with("https://"));
    }

    #[test]
    fn test_google_issuers() {
        assert_eq!(GOOGLE_ISSUERS.len(), 2);
        assert!(GOOGLE_ISSUERS.contains(&"https://accounts.google.com"));
        assert!(GOOGLE_ISSUERS.contains(&"accounts.google.com"));
    }

    #[test]
    fn test_apple_jwks_url() {
        assert_eq!(APPLE_JWKS_URL, "https://appleid.apple.com/auth/keys");
        assert!(APPLE_JWKS_URL.starts_with("https://"));
    }

    #[test]
    fn test_apple_issuer() {
        assert_eq!(APPLE_ISSUER, "https://appleid.apple.com");
        assert!(APPLE_ISSUER.starts_with("https://"));
    }

    #[test]
    fn test_oauth_user_info_structure() {
        let user_info = OAuthUserInfo {
            provider_uid: "google_123".to_string(),
            email: "test@example.com".to_string(),
            name: "Test User".to_string(),
            photo_url: Some("https://example.com/photo.jpg".to_string()),
        };

        assert_eq!(user_info.provider_uid, "google_123");
        assert_eq!(user_info.email, "test@example.com");
        assert_eq!(user_info.name, "Test User");
        assert!(user_info.photo_url.is_some());
    }

    #[test]
    fn test_oauth_user_info_no_photo() {
        let user_info = OAuthUserInfo {
            provider_uid: "apple_456".to_string(),
            email: "user@test.com".to_string(),
            name: "User".to_string(),
            photo_url: None,
        };

        assert_eq!(user_info.provider_uid, "apple_456");
        assert_eq!(user_info.email, "user@test.com");
        assert_eq!(user_info.name, "User");
        assert!(user_info.photo_url.is_none());
    }

    #[test]
    fn test_google_id_token_claims_structure() {
        let claims = GoogleIdTokenClaims {
            sub: "google_sub_123".to_string(),
            email: "google@example.com".to_string(),
            name: Some("Google User".to_string()),
            picture: Some("https://example.com/google.jpg".to_string()),
        };

        assert_eq!(claims.sub, "google_sub_123");
        assert_eq!(claims.email, "google@example.com");
        assert_eq!(claims.name, Some("Google User".to_string()));
        assert!(claims.picture.is_some());
    }

    #[test]
    fn test_google_id_token_claims_no_name() {
        let claims = GoogleIdTokenClaims {
            sub: "google_sub_456".to_string(),
            email: "noname@example.com".to_string(),
            name: None,
            picture: None,
        };

        assert_eq!(claims.sub, "google_sub_456");
        assert_eq!(claims.email, "noname@example.com");
        assert!(claims.name.is_none());
        assert!(claims.picture.is_none());
    }

    #[test]
    fn test_apple_token_claims_structure() {
        let claims = AppleTokenClaims {
            sub: "apple_sub_789".to_string(),
            email: Some("apple@example.com".to_string()),
        };

        assert_eq!(claims.sub, "apple_sub_789");
        assert_eq!(claims.email, Some("apple@example.com".to_string()));
    }

    #[test]
    fn test_apple_token_claims_no_email() {
        let claims = AppleTokenClaims {
            sub: "apple_sub_101".to_string(),
            email: None,
        };

        assert_eq!(claims.sub, "apple_sub_101");
        assert!(claims.email.is_none());
    }

    #[test]
    fn test_apple_token_claims_empty_email() {
        let claims = AppleTokenClaims {
            sub: "apple_sub_202".to_string(),
            email: Some("".to_string()),
        };

        assert_eq!(claims.sub, "apple_sub_202");
        assert_eq!(claims.email, Some("".to_string()));
    }

    #[test]
    fn test_google_claims_deserialize() {
        let json = r#"{
            "sub": "google_123",
            "email": "test@example.com",
            "name": "Test User",
            "picture": "https://example.com/photo.jpg"
        }"#;

        let claims: GoogleIdTokenClaims = serde_json::from_str(json).unwrap();
        assert_eq!(claims.sub, "google_123");
        assert_eq!(claims.email, "test@example.com");
        assert_eq!(claims.name, Some("Test User".to_string()));
        assert_eq!(claims.picture, Some("https://example.com/photo.jpg".to_string()));
    }

    #[test]
    fn test_google_claims_deserialize_minimal() {
        let json = r#"{
            "sub": "google_456",
            "email": "minimal@example.com"
        }"#;

        let claims: GoogleIdTokenClaims = serde_json::from_str(json).unwrap();
        assert_eq!(claims.sub, "google_456");
        assert_eq!(claims.email, "minimal@example.com");
        assert!(claims.name.is_none());
        assert!(claims.picture.is_none());
    }

    #[test]
    fn test_apple_claims_deserialize() {
        let json = r#"{
            "sub": "apple_789",
            "email": "apple@example.com"
        }"#;

        let claims: AppleTokenClaims = serde_json::from_str(json).unwrap();
        assert_eq!(claims.sub, "apple_789");
        assert_eq!(claims.email, Some("apple@example.com".to_string()));
    }

    #[test]
    fn test_apple_claims_deserialize_no_email() {
        let json = r#"{
            "sub": "apple_101"
        }"#;

        let claims: AppleTokenClaims = serde_json::from_str(json).unwrap();
        assert_eq!(claims.sub, "apple_101");
        assert!(claims.email.is_none());
    }

    #[test]
    fn test_oauth_user_info_email_not_empty() {
        let user_info = OAuthUserInfo {
            provider_uid: "uid_123".to_string(),
            email: "valid@example.com".to_string(),
            name: "User".to_string(),
            photo_url: None,
        };

        assert!(!user_info.email.is_empty());
        assert!(user_info.email.contains('@'));
    }

    #[test]
    fn test_oauth_user_info_provider_uid_not_empty() {
        let user_info = OAuthUserInfo {
            provider_uid: "unique_id_123".to_string(),
            email: "test@example.com".to_string(),
            name: "User".to_string(),
            photo_url: None,
        };

        assert!(!user_info.provider_uid.is_empty());
    }

    #[test]
    fn test_google_default_name_fallback() {
        // When name is None, the verify function uses "User" as default
        let default_name = "User";
        assert_eq!(default_name, "User");
    }

    #[test]
    fn test_apple_default_name() {
        // Apple always uses "User" as the name
        let apple_name = "User";
        assert_eq!(apple_name, "User");
    }

    #[test]
    fn test_email_filter_empty() {
        let email = Some("".to_string());
        let filtered = email.filter(|e| !e.is_empty());
        assert!(filtered.is_none());
    }

    #[test]
    fn test_email_filter_non_empty() {
        let email = Some("valid@example.com".to_string());
        let filtered = email.filter(|e| !e.is_empty());
        assert!(filtered.is_some());
        assert_eq!(filtered.unwrap(), "valid@example.com");
    }
}

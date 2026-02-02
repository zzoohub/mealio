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

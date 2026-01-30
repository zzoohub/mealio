use serde::Deserialize;

use crate::error::AppError;

#[derive(Debug)]
pub struct OAuthUserInfo {
    pub provider_uid: String,
    pub email: String,
    pub name: String,
    pub photo_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleTokenInfo {
    sub: String,
    email: String,
    name: Option<String>,
    picture: Option<String>,
    aud: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct AppleTokenClaims {
    sub: String,
    email: Option<String>,
    aud: String,
}

pub async fn verify_google_token(
    id_token: &str,
    client_id: &str,
) -> Result<OAuthUserInfo, AppError> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://oauth2.googleapis.com/tokeninfo")
        .form(&[("id_token", id_token)])
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(AppError::Unauthorized("authentication failed".into()));
    }

    let info: GoogleTokenInfo = response
        .json()
        .await
        .map_err(|_| AppError::Unauthorized("authentication failed".into()))?;

    if info.aud != client_id {
        tracing::warn!("Google token audience mismatch: expected {client_id}, got {}", info.aud);
        return Err(AppError::Unauthorized("authentication failed".into()));
    }

    Ok(OAuthUserInfo {
        provider_uid: info.sub,
        email: info.email,
        name: info.name.unwrap_or_else(|| "User".to_string()),
        photo_url: info.picture,
    })
}

pub async fn verify_apple_token(
    id_token: &str,
    _team_id: &str,
    bundle_id: &str,
) -> Result<OAuthUserInfo, AppError> {
    let header = jsonwebtoken::decode_header(id_token)
        .map_err(|e| {
            tracing::warn!("invalid Apple token header: {e}");
            AppError::Unauthorized("authentication failed".into())
        })?;

    // Fetch Apple's public keys
    let jwks_response = reqwest::get("https://appleid.apple.com/auth/keys").await?;
    let jwks: serde_json::Value = jwks_response
        .json()
        .await
        .map_err(|_| AppError::Unauthorized("authentication failed".into()))?;

    let kid = header
        .kid
        .ok_or_else(|| AppError::Unauthorized("authentication failed".into()))?;

    let key = jwks["keys"]
        .as_array()
        .and_then(|keys| keys.iter().find(|k| k["kid"].as_str() == Some(&kid)))
        .ok_or_else(|| AppError::Unauthorized("authentication failed".into()))?;

    let n = key["n"]
        .as_str()
        .ok_or_else(|| AppError::Unauthorized("authentication failed".into()))?;
    let e = key["e"]
        .as_str()
        .ok_or_else(|| AppError::Unauthorized("authentication failed".into()))?;

    let decoding_key = jsonwebtoken::DecodingKey::from_rsa_components(n, e)
        .map_err(|_| AppError::Unauthorized("authentication failed".into()))?;

    // C4 fix: hardcode RS256, never trust alg from token header
    let mut validation = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::RS256);
    validation.set_audience(&[bundle_id]);
    validation.set_issuer(&["https://appleid.apple.com"]);

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

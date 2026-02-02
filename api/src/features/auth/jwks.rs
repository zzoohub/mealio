use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use jsonwebtoken::DecodingKey;
use tokio::sync::RwLock;

use crate::error::AppError;

struct CachedKey {
    decoding_key: DecodingKey,
}

struct CachedKeySet {
    keys: HashMap<String, CachedKey>,
    fetched_at: Instant,
}

#[derive(Clone)]
pub struct JwksCache {
    inner: Arc<RwLock<HashMap<String, CachedKeySet>>>,
    ttl: Duration,
}

impl JwksCache {
    pub fn new(ttl: Duration) -> Self {
        Self {
            inner: Arc::new(RwLock::new(HashMap::new())),
            ttl,
        }
    }

    pub async fn get_key(
        &self,
        jwks_url: &str,
        kid: &str,
    ) -> Result<DecodingKey, AppError> {
        // Try cache first
        {
            let cache = self.inner.read().await;
            if let Some(key_set) = cache.get(jwks_url) {
                if key_set.fetched_at.elapsed() < self.ttl {
                    if let Some(cached) = key_set.keys.get(kid) {
                        return Ok(cached.decoding_key.clone());
                    }
                    // kid not found but cache is fresh -- fall through to re-fetch
                    // (handles key rotation where a new kid appears)
                }
            }
        }

        // Cache miss or stale -- fetch and update
        self.fetch_and_cache(jwks_url, kid).await
    }

    async fn fetch_and_cache(
        &self,
        jwks_url: &str,
        kid: &str,
    ) -> Result<DecodingKey, AppError> {
        let response = reqwest::get(jwks_url).await.map_err(|e| {
            tracing::error!("failed to fetch JWKS from {jwks_url}: {e}");
            AppError::Internal("failed to fetch identity provider keys".into())
        })?;

        let jwks: serde_json::Value = response.json().await.map_err(|e| {
            tracing::error!("failed to parse JWKS from {jwks_url}: {e}");
            AppError::Internal("failed to parse identity provider keys".into())
        })?;

        let keys_array = jwks["keys"]
            .as_array()
            .ok_or_else(|| AppError::Internal("invalid JWKS response".into()))?;

        let mut keys = HashMap::new();
        for key in keys_array {
            let Some(key_kid) = key["kid"].as_str() else {
                continue;
            };
            let Some(n) = key["n"].as_str() else {
                continue;
            };
            let Some(e) = key["e"].as_str() else {
                continue;
            };

            if let Ok(decoding_key) = DecodingKey::from_rsa_components(n, e) {
                keys.insert(
                    key_kid.to_string(),
                    CachedKey { decoding_key },
                );
            }
        }

        let result = keys
            .get(kid)
            .map(|k| k.decoding_key.clone())
            .ok_or_else(|| {
                tracing::warn!("kid {kid} not found in JWKS from {jwks_url}");
                AppError::Unauthorized("authentication failed".into())
            })?;

        let mut cache = self.inner.write().await;
        cache.insert(
            jwks_url.to_string(),
            CachedKeySet {
                keys,
                fetched_at: Instant::now(),
            },
        );

        Ok(result)
    }
}

use chrono::{Duration, Utc};
use jsonwebtoken::{EncodingKey, Header};

use crate::extractors::Claims;

pub fn create_access_token(user_id: i64, secret: &str) -> Result<(String, i64), jsonwebtoken::errors::Error> {
    let expires_in = 900; // 15 minutes
    let now = Utc::now();
    let claims = Claims {
        sub: user_id,
        iat: now.timestamp() as usize,
        exp: (now + Duration::seconds(expires_in)).timestamp() as usize,
    };

    let token = jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    Ok((token, expires_in))
}

pub fn hash_token(token: &str) -> String {
    blake3::hash(token.as_bytes()).to_hex().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use jsonwebtoken::{decode, DecodingKey, Validation};

    #[test]
    fn test_create_access_token_success() {
        let user_id = 123;
        let secret = "test_secret_key_at_least_32_chars_long";

        let result = create_access_token(user_id, secret);
        assert!(result.is_ok());

        let (token, expires_in) = result.unwrap();
        assert_eq!(expires_in, 900); // 15 minutes
        assert!(!token.is_empty());
    }

    #[test]
    fn test_create_access_token_claims() {
        let user_id = 456;
        let secret = "test_secret_key_at_least_32_chars_long";

        let (token, _) = create_access_token(user_id, secret).unwrap();

        // Decode and verify claims
        let decoded = decode::<Claims>(
            &token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &Validation::default(),
        );

        assert!(decoded.is_ok());
        let claims = decoded.unwrap().claims;
        assert_eq!(claims.sub, user_id);
        assert!(claims.exp > claims.iat);
        assert_eq!(claims.exp - claims.iat, 900);
    }

    #[test]
    fn test_hash_token_deterministic() {
        let token = "test_token_123";
        let hash1 = hash_token(token);
        let hash2 = hash_token(token);

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64); // blake3 produces 32 bytes = 64 hex chars
    }

    #[test]
    fn test_hash_token_different_inputs() {
        let token1 = "token_one";
        let token2 = "token_two";

        let hash1 = hash_token(token1);
        let hash2 = hash_token(token2);

        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_hash_token_empty_string() {
        let hash = hash_token("");
        assert!(!hash.is_empty());
        assert_eq!(hash.len(), 64);
    }
}

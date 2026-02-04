use axum::extract::{FromRef, FromRequestParts};
use axum::http::request::Parts;
use jsonwebtoken::{DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::error::AppError;
use crate::AppState;

// Database extractor
pub struct Db(pub PgPool);

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.db.clone()
    }
}

impl<S> FromRequestParts<S> for Db
where
    PgPool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        Ok(Db(PgPool::from_ref(state)))
    }
}

// Auth extractor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: i64,
    pub exp: usize,
    pub iat: usize,
    pub jti: String,
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: i64,
}

impl<S> FromRequestParts<S> for AuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);

        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("missing authorization header".into()))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError::Unauthorized("invalid authorization format".into()))?;

        let token_data = jsonwebtoken::decode::<Claims>(
            token,
            &DecodingKey::from_secret(app_state.jwt_secret.as_bytes()),
            &Validation::default(),
        )?;

        Ok(AuthUser {
            user_id: token_data.claims.sub,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_claims_structure() {
        let claims = Claims {
            sub: 123,
            exp: 1234567890,
            iat: 1234567800,
            jti: "test-jti".to_string(),
        };

        assert_eq!(claims.sub, 123);
        assert_eq!(claims.exp, 1234567890);
        assert_eq!(claims.iat, 1234567800);
        assert_eq!(claims.jti, "test-jti");
    }

    #[test]
    fn test_claims_serialize() {
        let claims = Claims {
            sub: 456,
            exp: 2000000000,
            iat: 1999999900,
            jti: "uuid-123".to_string(),
        };

        let serialized = serde_json::to_string(&claims).unwrap();
        assert!(serialized.contains("\"sub\":456"));
        assert!(serialized.contains("\"exp\":2000000000"));
        assert!(serialized.contains("\"iat\":1999999900"));
        assert!(serialized.contains("\"jti\":\"uuid-123\""));
    }

    #[test]
    fn test_claims_deserialize() {
        let json = r#"{"sub":789,"exp":3000000000,"iat":2999999900,"jti":"test-uuid"}"#;
        let claims: Claims = serde_json::from_str(json).unwrap();

        assert_eq!(claims.sub, 789);
        assert_eq!(claims.exp, 3000000000);
        assert_eq!(claims.iat, 2999999900);
        assert_eq!(claims.jti, "test-uuid");
    }

    #[test]
    fn test_claims_clone() {
        let claims1 = Claims {
            sub: 111,
            exp: 1234567890,
            iat: 1234567800,
            jti: "clone-test".to_string(),
        };

        let claims2 = claims1.clone();
        assert_eq!(claims1.sub, claims2.sub);
        assert_eq!(claims1.exp, claims2.exp);
        assert_eq!(claims1.iat, claims2.iat);
        assert_eq!(claims1.jti, claims2.jti);
    }

    #[test]
    fn test_auth_user_structure() {
        let auth_user = AuthUser { user_id: 999 };
        assert_eq!(auth_user.user_id, 999);
    }

    #[test]
    fn test_auth_user_clone() {
        let user1 = AuthUser { user_id: 555 };
        let user2 = user1.clone();
        assert_eq!(user1.user_id, user2.user_id);
    }

    #[test]
    fn test_auth_user_different_ids() {
        let user1 = AuthUser { user_id: 100 };
        let user2 = AuthUser { user_id: 200 };
        assert_ne!(user1.user_id, user2.user_id);
    }

    #[test]
    fn test_claims_expiry_validation() {
        let now = 1234567890;
        let claims = Claims {
            sub: 1,
            exp: now + 900, // expires in 15 minutes
            iat: now,
            jti: "test".to_string(),
        };

        assert!(claims.exp > claims.iat);
        assert_eq!(claims.exp - claims.iat, 900);
    }

    #[test]
    fn test_claims_expired() {
        let now = 1234567890;
        let claims = Claims {
            sub: 1,
            exp: now - 100, // expired 100 seconds ago
            iat: now - 1000,
            jti: "expired".to_string(),
        };

        assert!(claims.exp < now);
    }

    #[test]
    fn test_claims_jti_format() {
        let claims = Claims {
            sub: 1,
            exp: 1234567890,
            iat: 1234567800,
            jti: "550e8400-e29b-41d4-a716-446655440000".to_string(),
        };

        assert!(!claims.jti.is_empty());
        assert_eq!(claims.jti.len(), 36); // UUID format
    }

    #[test]
    fn test_auth_user_positive_id() {
        let user = AuthUser { user_id: 12345 };
        assert!(user.user_id > 0);
    }

    #[test]
    fn test_claims_sub_positive() {
        let claims = Claims {
            sub: 67890,
            exp: 1234567890,
            iat: 1234567800,
            jti: "test".to_string(),
        };

        assert!(claims.sub > 0);
    }

    #[test]
    fn test_claims_roundtrip() {
        let original = Claims {
            sub: 42,
            exp: 1700000000,
            iat: 1699999100,
            jti: "roundtrip-test".to_string(),
        };

        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Claims = serde_json::from_str(&json).unwrap();

        assert_eq!(original.sub, deserialized.sub);
        assert_eq!(original.exp, deserialized.exp);
        assert_eq!(original.iat, deserialized.iat);
        assert_eq!(original.jti, deserialized.jti);
    }

    #[test]
    fn test_db_extractor_type() {
        // Test that Db wraps PgPool correctly (structure test)
        // We can't create a PgPool without a database connection,
        // but we can test the type exists and has the expected field
        fn accepts_pg_pool(_pool: PgPool) {}
        fn accepts_db(db: Db) {
            accepts_pg_pool(db.0);
        }

        // Type check compilation test
        let _ = accepts_db;
    }

    #[test]
    fn test_authorization_header_format_validation() {
        // Test the expected Bearer format
        let valid_header = "Bearer token123";
        assert!(valid_header.starts_with("Bearer "));

        let token = valid_header.strip_prefix("Bearer ");
        assert!(token.is_some());
        assert_eq!(token.unwrap(), "token123");
    }

    #[test]
    fn test_authorization_header_invalid_format() {
        let invalid_headers = vec![
            "Basic token123",
            "bearer token123", // lowercase
            "BearerToken123",  // no space
            "token123",        // no prefix
            "",
        ];

        for header in invalid_headers {
            let token = header.strip_prefix("Bearer ");
            assert!(token.is_none() || header.is_empty());
        }
    }

    #[test]
    fn test_authorization_header_extraction() {
        let auth_header = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
        let token = auth_header.strip_prefix("Bearer ");
        assert!(token.is_some());
        assert_eq!(token.unwrap(), "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    }
}


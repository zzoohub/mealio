# Axum + SQLx Examples

Transaction patterns, error handling, and testing.

---

## Error Handling (thiserror + IntoResponse)

### AppError Definition

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("resource not found")]
    NotFound,

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("unauthorized")]
    Unauthorized,

    #[error("forbidden")]
    Forbidden,

    #[error(transparent)]
    Database(#[from] sqlx::Error),

    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_type, message) = match &self {
            AppError::NotFound => (
                StatusCode::NOT_FOUND,
                "not_found",
                self.to_string(),
            ),
            AppError::Conflict(msg) => (
                StatusCode::CONFLICT,
                "conflict",
                msg.clone(),
            ),
            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                "bad_request",
                msg.clone(),
            ),
            AppError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                self.to_string(),
            ),
            AppError::Forbidden => (
                StatusCode::FORBIDDEN,
                "forbidden",
                self.to_string(),
            ),
            AppError::Database(e) => {
                // Map specific SQLx errors
                if let sqlx::Error::RowNotFound = e {
                    return AppError::NotFound.into_response();
                }
                if let Some(db_err) = e.as_database_error() {
                    if db_err.is_unique_violation() {
                        return AppError::Conflict("already exists".into()).into_response();
                    }
                    if db_err.is_foreign_key_violation() {
                        return AppError::BadRequest("invalid reference".into()).into_response();
                    }
                }
                tracing::error!("Database error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                    "internal server error".to_string(),
                )
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal_error",
                    "internal server error".to_string(),
                )
            }
        };

        let body = json!({
            "type": format!("https://api.example.com/errors/{}", error_type),
            "title": error_type.replace('_', " "),
            "status": status.as_u16(),
            "detail": message,
        });

        (status, Json(body)).into_response()
    }
}
```

### Usage in Handlers

```rust
pub async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_optional(&state.db)
        .await?  // Database errors auto-convert
        .ok_or(AppError::NotFound)?;  // None -> NotFound

    Ok(Json(user))
}

pub async fn create_user(
    State(state): State<AppState>,
    Json(input): Json<CreateUserInput>,
) -> Result<(StatusCode, Json<User>), AppError> {
    let user = sqlx::query_as!(
        User,
        "INSERT INTO users (id, email, name) VALUES ($1, $2, $3) RETURNING *",
        Uuid::new_v4(),
        input.email,
        input.name
    )
    .fetch_one(&state.db)
    .await?;  // Unique violation -> Conflict automatically

    Ok((StatusCode::CREATED, Json(user)))
}
```

---

## Transaction Patterns

### Basic Transaction

```rust
pub async fn transfer_money(
    State(state): State<AppState>,
    Json(input): Json<TransferInput>,
) -> Result<Json<Transfer>, AppError> {
    let mut tx = state.db.begin().await?;

    // Debit from source
    sqlx::query!(
        "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
        input.amount,
        input.from_account
    )
    .execute(&mut *tx)
    .await?;

    // Credit to destination
    sqlx::query!(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
        input.amount,
        input.to_account
    )
    .execute(&mut *tx)
    .await?;

    // Record transfer
    let transfer = sqlx::query_as!(
        Transfer,
        r#"
        INSERT INTO transfers (id, from_account, to_account, amount)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#,
        Uuid::new_v4(),
        input.from_account,
        input.to_account,
        input.amount
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(transfer))
}
```

### Transaction with Validation

```rust
pub async fn create_order(
    State(state): State<AppState>,
    Json(input): Json<CreateOrderInput>,
) -> Result<Json<Order>, AppError> {
    let mut tx = state.db.begin().await?;

    // Check inventory (with row lock)
    let product = sqlx::query_as!(
        Product,
        "SELECT * FROM products WHERE id = $1 FOR UPDATE",
        input.product_id
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    if product.stock < input.quantity {
        return Err(AppError::BadRequest("insufficient stock".into()));
    }

    // Decrement stock
    sqlx::query!(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        input.quantity,
        input.product_id
    )
    .execute(&mut *tx)
    .await?;

    // Create order
    let order = sqlx::query_as!(
        Order,
        r#"
        INSERT INTO orders (id, product_id, quantity, total)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#,
        Uuid::new_v4(),
        input.product_id,
        input.quantity,
        product.price * input.quantity as f64
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(order))
}
```

---

## Testing

### Test Setup with #[sqlx::test]

```rust
// tests/users.rs
use sqlx::PgPool;

#[sqlx::test]
async fn test_create_user(pool: PgPool) {
    // Test runs in transaction, auto-rollback after
    let user = sqlx::query_as!(
        User,
        "INSERT INTO users (id, email, name) VALUES ($1, $2, $3) RETURNING *",
        Uuid::new_v4(),
        "test@example.com",
        "Test User"
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(user.email, "test@example.com");
    // No cleanup needed - transaction rolls back
}

#[sqlx::test]
async fn test_duplicate_email_fails(pool: PgPool) {
    let id = Uuid::new_v4();
    
    // First insert
    sqlx::query!(
        "INSERT INTO users (id, email, name) VALUES ($1, $2, $3)",
        id,
        "dupe@example.com",
        "First"
    )
    .execute(&pool)
    .await
    .unwrap();

    // Second insert with same email should fail
    let result = sqlx::query!(
        "INSERT INTO users (id, email, name) VALUES ($1, $2, $3)",
        Uuid::new_v4(),
        "dupe@example.com",
        "Second"
    )
    .execute(&pool)
    .await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.as_database_error().unwrap().is_unique_violation());
}
```

### Integration Test with Axum

```rust
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt;  // for oneshot

async fn setup_test_app() -> (Router, PgPool) {
    let pool = PgPoolOptions::new()
        .connect(&std::env::var("TEST_DATABASE_URL").unwrap())
        .await
        .unwrap();

    let state = AppState { db: pool.clone() };
    let app = create_router(state);

    (app, pool)
}

#[tokio::test]
async fn test_get_user_not_found() {
    let (app, _pool) = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/users/00000000-0000-0000-0000-000000000000")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_create_user_success() {
    let (app, _pool) = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/users")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    r#"{"email": "new@example.com", "name": "New User"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
}
```

### Test Fixtures

```rust
// tests/fixtures.rs
use sqlx::PgPool;

pub struct TestFixtures {
    pub user_id: Uuid,
    pub product_id: Uuid,
}

impl TestFixtures {
    pub async fn create(pool: &PgPool) -> Self {
        let user_id = Uuid::new_v4();
        let product_id = Uuid::new_v4();

        sqlx::query!(
            "INSERT INTO users (id, email, name) VALUES ($1, $2, $3)",
            user_id,
            "fixture@example.com",
            "Fixture User"
        )
        .execute(pool)
        .await
        .unwrap();

        sqlx::query!(
            "INSERT INTO products (id, name, price, stock) VALUES ($1, $2, $3, $4)",
            product_id,
            "Test Product",
            99.99,
            100
        )
        .execute(pool)
        .await
        .unwrap();

        Self { user_id, product_id }
    }
}

#[sqlx::test]
async fn test_create_order_with_fixtures(pool: PgPool) {
    let fixtures = TestFixtures::create(&pool).await;

    // Now use fixtures.user_id, fixtures.product_id in tests
}
```

---

## Middleware Patterns

### Request ID Middleware

```rust
use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

pub async fn request_id_middleware(mut request: Request, next: Next) -> Response {
    let request_id = Uuid::new_v4().to_string();
    
    request
        .headers_mut()
        .insert("x-request-id", request_id.parse().unwrap());

    let mut response = next.run(request).await;
    
    response
        .headers_mut()
        .insert("x-request-id", request_id.parse().unwrap());

    response
}

// Apply to router
let app = Router::new()
    .route("/users", get(list_users))
    .layer(middleware::from_fn(request_id_middleware));
```

### Auth Middleware

```rust
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};

pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    let user = verify_token_and_get_user(&state.db, token)
        .await?
        .ok_or(AppError::Unauthorized)?;

    request.extensions_mut().insert(user);

    Ok(next.run(request).await)
}

// Extract user in handler
pub async fn protected_handler(
    Extension(user): Extension<User>,
) -> impl IntoResponse {
    Json(user)
}
```

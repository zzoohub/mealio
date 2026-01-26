# Axum + SQLx Examples

---

## Foundation

### AppState

```rust
// src/lib.rs
use sqlx::PgPool;

pub mod error;
pub mod extractors;
pub mod response;
pub mod features;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
}
```

### Response Types

```rust
// src/response.rs
use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use serde::Serialize;

pub struct Created<T>(pub T);
pub struct Ok<T>(pub T);
pub struct NoContent;

impl<T: Serialize> IntoResponse for Created<T> {
    fn into_response(self) -> Response {
        (StatusCode::CREATED, Json(self.0)).into_response()
    }
}

impl<T: Serialize> IntoResponse for Ok<T> {
    fn into_response(self) -> Response {
        Json(self.0).into_response()
    }
}

impl IntoResponse for NoContent {
    fn into_response(self) -> Response {
        StatusCode::NO_CONTENT.into_response()
    }
}
```

### Db Extractor

```rust
// src/extractors.rs
use axum::extract::FromRef;
use sqlx::PgPool;
use std::convert::Infallible;
use crate::AppState;

pub struct Db(pub PgPool);

impl<S> axum::extract::FromRequestParts<S> for Db
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Infallible;

    async fn from_request_parts(
        _: &mut axum::http::request::Parts,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        Ok(Db(AppState::from_ref(state).db.clone()))
    }
}
```

### AppError (RFC 9457)

```rust
// src/error.rs
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("not found")]
    NotFound,
    #[error("{0}")]
    Conflict(String),
    #[error("{0}")]
    BadRequest(String),
    #[error("unauthorized")]
    Unauthorized,
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

#[derive(Serialize)]
struct ProblemDetails {
    r#type: String,
    title: String,
    status: u16,
    detail: String,
}

impl AppError {
    fn to_problem(&self) -> (StatusCode, ProblemDetails) {
        let (status, error_type, title) = match self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "not-found", "Not Found"),
            AppError::Conflict(_) => (StatusCode::CONFLICT, "conflict", "Conflict"),
            AppError::BadRequest(_) => (StatusCode::BAD_REQUEST, "bad-request", "Bad Request"),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized", "Unauthorized"),
            AppError::Database(e) => {
                if matches!(e, sqlx::Error::RowNotFound) {
                    return AppError::NotFound.to_problem();
                }
                if let Some(db_err) = e.as_database_error() {
                    if db_err.is_unique_violation() {
                        return AppError::Conflict("Resource already exists".into()).to_problem();
                    }
                    if db_err.is_foreign_key_violation() {
                        return AppError::BadRequest("Invalid reference".into()).to_problem();
                    }
                }
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal-error", "Internal Server Error")
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal-error", "Internal Server Error")
            }
        };

        let detail = match self {
            AppError::Database(_) | AppError::Internal(_) => "An unexpected error occurred".into(),
            _ => self.to_string(),
        };

        (
            status,
            ProblemDetails {
                r#type: format!("https://api.example.com/errors/{}", error_type),
                title: title.into(),
                status: status.as_u16(),
                detail,
            },
        )
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, problem) = self.to_problem();
        (status, Json(problem)).into_response()
    }
}
```

---

## CRUD

### Model + Repository

```rust
// src/features/users/models.rs
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use crate::error::AppError;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUser {
    pub email: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUser {
    pub name: Option<String>,
}

impl User {
    pub async fn find(db: &PgPool, id: Uuid) -> Result<Option<Self>, AppError> {
        sqlx::query_as!(Self, "SELECT * FROM users WHERE id = $1", id)
            .fetch_optional(db)
            .await
            .map_err(Into::into)
    }

    pub async fn find_or_404(db: &PgPool, id: Uuid) -> Result<Self, AppError> {
        Self::find(db, id).await?.ok_or(AppError::NotFound)
    }

    pub async fn list(db: &PgPool, limit: i64, offset: i64) -> Result<Vec<Self>, AppError> {
        sqlx::query_as!(
            Self,
            "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            limit, offset
        )
        .fetch_all(db)
        .await
        .map_err(Into::into)
    }

    pub async fn create(db: &PgPool, input: CreateUser) -> Result<Self, AppError> {
        sqlx::query_as!(
            Self,
            r#"
            INSERT INTO users (id, email, name, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING *
            "#,
            Uuid::new_v4(),
            input.email,
            input.name
        )
        .fetch_one(db)
        .await
        .map_err(Into::into)
    }

    pub async fn update(db: &PgPool, id: Uuid, input: UpdateUser) -> Result<Self, AppError> {
        sqlx::query_as!(
            Self,
            "UPDATE users SET name = COALESCE($2, name) WHERE id = $1 RETURNING *",
            id, input.name
        )
        .fetch_optional(db)
        .await?
        .ok_or(AppError::NotFound)
    }

    pub async fn delete(db: &PgPool, id: Uuid) -> Result<(), AppError> {
        let result = sqlx::query!("DELETE FROM users WHERE id = $1", id)
            .execute(db)
            .await?;
        
        if result.rows_affected() == 0 {
            return Err(AppError::NotFound);
        }
        Ok(())
    }
}
```

### Handlers

```rust
// src/features/users/handlers.rs
use axum::{extract::{Path, Query}, Json};
use serde::Deserialize;
use uuid::Uuid;
use crate::{extractors::Db, response::{Created, Ok, NoContent}, error::AppError};
use super::models::{CreateUser, UpdateUser, User};

#[derive(Deserialize)]
pub struct ListParams {
    #[serde(default = "default_limit")]
    limit: i64,
    #[serde(default)]
    offset: i64,
}

fn default_limit() -> i64 { 20 }

pub async fn list(Db(db): Db, Query(params): Query<ListParams>) -> Result<Ok<Vec<User>>, AppError> {
    User::list(&db, params.limit, params.offset).await.map(Ok)
}

pub async fn get(Db(db): Db, Path(id): Path<Uuid>) -> Result<Ok<User>, AppError> {
    User::find_or_404(&db, id).await.map(Ok)
}

pub async fn create(Db(db): Db, Json(input): Json<CreateUser>) -> Result<Created<User>, AppError> {
    User::create(&db, input).await.map(Created)
}

pub async fn update(
    Db(db): Db,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateUser>,
) -> Result<Ok<User>, AppError> {
    User::update(&db, id, input).await.map(Ok)
}

pub async fn delete(Db(db): Db, Path(id): Path<Uuid>) -> Result<NoContent, AppError> {
    User::delete(&db, id).await.map(|_| NoContent)
}
```

### Router

```rust
// src/features/users/router.rs
use axum::{routing::get, Router};
use super::handlers;

pub fn router() -> Router<crate::AppState> {
    Router::new()
        .route("/users", get(handlers::list).post(handlers::create))
        .route("/users/{id}", get(handlers::get).put(handlers::update).delete(handlers::delete))
}
```

---

## Transactions

### With Validation

```rust
pub async fn transfer(
    Db(db): Db,
    Json(input): Json<TransferInput>,
) -> Result<Created<Transfer>, AppError> {
    let mut tx = db.begin().await?;

    // Debit with balance check
    let result = sqlx::query!(
        "UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1",
        input.amount,
        input.from_account
    )
    .execute(&mut *tx)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::BadRequest("Insufficient balance".into()));
    }

    // Credit
    sqlx::query!(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
        input.amount,
        input.to_account
    )
    .execute(&mut *tx)
    .await?;

    // Record
    let transfer = sqlx::query_as!(
        Transfer,
        "INSERT INTO transfers (id, from_account, to_account, amount) VALUES ($1, $2, $3, $4) RETURNING *",
        Uuid::new_v4(),
        input.from_account,
        input.to_account,
        input.amount
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(Created(transfer))
}
```

### Row Locking

```rust
pub async fn create_order(db: &PgPool, input: CreateOrderInput) -> Result<Order, AppError> {
    let mut tx = db.begin().await?;

    // Lock row
    let product = sqlx::query_as!(
        Product,
        "SELECT * FROM products WHERE id = $1 FOR UPDATE",
        input.product_id
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    if product.stock < input.quantity {
        return Err(AppError::BadRequest("Insufficient stock".into()));
    }

    sqlx::query!(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        input.quantity,
        input.product_id
    )
    .execute(&mut *tx)
    .await?;

    let order = sqlx::query_as!(
        Order,
        "INSERT INTO orders (id, product_id, quantity, total) VALUES ($1, $2, $3, $4) RETURNING *",
        Uuid::new_v4(),
        input.product_id,
        input.quantity,
        product.price * input.quantity as i64
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(order)
}
```

---

## Middleware (Tower Layers)

### App Composition

```rust
// src/main.rs
use axum::Router;
use std::time::Duration;
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let db = db::connect().await;
    let state = AppState { db };

    let app = Router::new()
        .merge(users::router())
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(TimeoutLayer::new(Duration::from_secs(10)))
                .layer(CompressionLayer::new())
                .layer(
                    CorsLayer::new()
                        .allow_origin(["https://example.com".parse().unwrap()])
                        .allow_methods(Any),
                ),
        )
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### Auth Layer

```rust
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use crate::{AppState, error::AppError};

pub async fn require_auth(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .ok_or(AppError::Unauthorized)?;

    let user = verify_token(&state.db, token)
        .await?
        .ok_or(AppError::Unauthorized)?;

    req.extensions_mut().insert(user);
    Ok(next.run(req).await)
}

// Compose: wrap routes with auth layer
use axum::middleware;

let protected = Router::new()
    .route("/me", get(get_current_user))
    .route("/settings", put(update_settings))
    .layer(middleware::from_fn_with_state(state.clone(), require_auth));

let public = Router::new()
    .route("/health", get(health_check));

let app = Router::new()
    .merge(protected)
    .merge(public)
    .with_state(state);
```

### Request ID Layer

```rust
use axum::{extract::Request, middleware::Next, response::Response};
use uuid::Uuid;

pub async fn request_id(mut req: Request, next: Next) -> Response {
    let id = Uuid::new_v4().to_string();
    req.headers_mut().insert("x-request-id", id.parse().unwrap());

    let mut res = next.run(req).await;
    res.headers_mut().insert("x-request-id", id.parse().unwrap());
    res
}
```

---

## Testing

### Repository Tests

```rust
#[sqlx::test]
async fn test_create_user(pool: PgPool) {
    let user = User::create(&pool, CreateUser {
        email: "test@example.com".into(),
        name: "Test".into(),
    })
    .await
    .unwrap();

    assert_eq!(user.email, "test@example.com");
}

#[sqlx::test]
async fn test_duplicate_email_returns_conflict(pool: PgPool) {
    let input = CreateUser {
        email: "dupe@example.com".into(),
        name: "First".into(),
    };
    User::create(&pool, input.clone()).await.unwrap();

    let err = User::create(&pool, input).await.unwrap_err();
    assert!(matches!(err, AppError::Conflict(_)));
}

#[sqlx::test]
async fn test_delete_nonexistent_returns_not_found(pool: PgPool) {
    let err = User::delete(&pool, Uuid::new_v4()).await.unwrap_err();
    assert!(matches!(err, AppError::NotFound));
}
```

### HTTP Tests

```rust
use axum::{body::Body, http::{Request, StatusCode}};
use tower::ServiceExt;

#[tokio::test]
async fn test_get_returns_404_for_nonexistent() {
    let app = test_app().await;

    let res = app
        .oneshot(
            Request::get("/users/00000000-0000-0000-0000-000000000000")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_create_returns_201() {
    let app = test_app().await;

    let res = app
        .oneshot(
            Request::post("/users")
                .header("Content-Type", "application/json")
                .body(Body::from(r#"{"email":"new@test.com","name":"New"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
}
```

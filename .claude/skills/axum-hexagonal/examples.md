# Examples: Axum Hexagonal Architecture

## Domain Models

```rust
// src/domain/authors/models.rs
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Author {
    id: Uuid,
    name: AuthorName,
}

impl Author {
    pub fn new(id: Uuid, name: AuthorName) -> Self { Self { id, name } }
    pub fn id(&self) -> &Uuid { &self.id }
    pub fn name(&self) -> &AuthorName { &self.name }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthorName(String);

#[derive(Clone, Debug, Error)]
#[error("author name cannot be empty")]
pub struct AuthorNameEmptyError;

impl AuthorName {
    pub fn new(raw: &str) -> Result<Self, AuthorNameEmptyError> {
        let trimmed = raw.trim();
        if trimmed.is_empty() { Err(AuthorNameEmptyError) }
        else { Ok(Self(trimmed.to_string())) }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateAuthorRequest { name: AuthorName }

impl CreateAuthorRequest {
    pub fn new(name: AuthorName) -> Self { Self { name } }
    pub fn name(&self) -> &AuthorName { &self.name }
}
```

## Domain Errors

```rust
// src/domain/authors/error.rs
#[derive(Debug, Error)]
pub enum CreateAuthorError {
    #[error("author with name {name} already exists")]
    Duplicate { name: AuthorName },
    #[error(transparent)]
    Unknown(#[from] anyhow::Error),
}
```

## Ports

```rust
// src/domain/authors/ports.rs
pub trait AuthorRepository: Clone + Send + Sync + 'static {
    fn create_author(
        &self, req: &CreateAuthorRequest,
    ) -> impl Future<Output = Result<Author, CreateAuthorError>> + Send;

    fn find_author(
        &self, id: &Uuid,
    ) -> impl Future<Output = Result<Option<Author>, anyhow::Error>> + Send;
}

pub trait AuthorMetrics: Clone + Send + Sync + 'static {
    fn record_creation_success(&self) -> impl Future<Output = ()> + Send;
    fn record_creation_failure(&self) -> impl Future<Output = ()> + Send;
}

pub trait AuthorNotifier: Clone + Send + Sync + 'static {
    fn author_created(&self, author: &Author) -> impl Future<Output = ()> + Send;
}

pub trait AuthorService: Clone + Send + Sync + 'static {
    fn create_author(
        &self, req: &CreateAuthorRequest,
    ) -> impl Future<Output = Result<Author, CreateAuthorError>> + Send;
}
```

## Service Implementation

```rust
// src/domain/authors/service.rs
#[derive(Debug, Clone)]
pub struct AuthorServiceImpl<R: AuthorRepository, M: AuthorMetrics, N: AuthorNotifier> {
    repo: R, metrics: M, notifier: N,
}

impl<R: AuthorRepository, M: AuthorMetrics, N: AuthorNotifier>
    AuthorService for AuthorServiceImpl<R, M, N>
{
    async fn create_author(&self, req: &CreateAuthorRequest) -> Result<Author, CreateAuthorError> {
        let result = self.repo.create_author(req).await;
        match &result {
            Ok(author) => {
                self.metrics.record_creation_success().await;
                self.notifier.author_created(author).await;
            }
            Err(_) => self.metrics.record_creation_failure().await,
        }
        result
    }
}
```

---

## Outbound: SQLite Adapter

```rust
// src/outbound/sqlite.rs
const UNIQUE_CONSTRAINT_VIOLATION: &str = "2067";

#[derive(Debug, Clone)]
pub struct Sqlite { pool: sqlx::SqlitePool }

impl Sqlite {
    pub async fn new(path: &str) -> anyhow::Result<Self> {
        let pool = sqlx::SqlitePool::connect_with(
            SqliteConnectOptions::from_str(path)?
                .pragma("foreign_keys", "ON"),
        ).await.with_context(|| format!("failed to open db at {}", path))?;
        Ok(Self { pool })
    }
    pub fn from_pool(pool: sqlx::SqlitePool) -> Self { Self { pool } }
}

impl AuthorRepository for Sqlite {
    async fn create_author(&self, req: &CreateAuthorRequest) -> Result<Author, CreateAuthorError> {
        let mut tx = self.pool.begin().await.context("failed to start tx")?;
        let id = Uuid::new_v4();
        sqlx::query!("INSERT INTO authors (id, name) VALUES ($1, $2)",
            id.to_string(), req.name().to_string())
            .execute(&mut *tx).await
            .map_err(|e| {
                if let sqlx::Error::Database(ref db_err) = e {
                    if db_err.code().map_or(false, |c| c == UNIQUE_CONSTRAINT_VIOLATION) {
                        return CreateAuthorError::Duplicate { name: req.name().clone() };
                    }
                }
                anyhow!(e).context(format!("failed to save author {:?}", req.name())).into()
            })?;
        tx.commit().await.context("failed to commit tx")?;
        Ok(Author::new(id, req.name().clone()))
    }

    async fn find_author(&self, id: &Uuid) -> Result<Option<Author>, anyhow::Error> {
        let id_str = id.to_string();
        let row = sqlx::query!("SELECT id, name FROM authors WHERE id = $1", id_str)
            .fetch_optional(&self.pool).await.context("failed to query author")?;
        match row {
            Some(r) => Ok(Some(Author::new(
                Uuid::parse_str(&r.id)?,
                AuthorName::new(&r.name).map_err(|e| anyhow!(e))?,
            ))),
            None => Ok(None),
        }
    }
}
```

## Outbound: Postgres Adapter (same trait, swap in main)

```rust
// src/outbound/postgres.rs
#[derive(Debug, Clone)]
pub struct Postgres { pool: sqlx::PgPool }

impl AuthorRepository for Postgres {
    async fn create_author(&self, req: &CreateAuthorRequest) -> Result<Author, CreateAuthorError> {
        let id = Uuid::new_v4();
        sqlx::query!("INSERT INTO authors (id, name) VALUES ($1, $2)",
            id, req.name().to_string())
            .execute(&self.pool).await
            .map_err(|e| {
                if e.as_database_error().map_or(false, |d| d.is_unique_violation()) {
                    CreateAuthorError::Duplicate { name: req.name().clone() }
                } else {
                    anyhow!(e).into()
                }
            })?;
        Ok(Author::new(id, req.name().clone()))
    }
    // find_author omitted
}
```

---

## Inbound: HttpServer Wrapper

```rust
// src/inbound/http/server.rs
pub struct HttpServer { router: Router, listener: TcpListener }

impl HttpServer {
    pub async fn new<AS: AuthorService>(
        author_service: AS, config: HttpServerConfig<'_>,
    ) -> anyhow::Result<Self> {
        let state = AppState { author_service: Arc::new(author_service) };
        let router = Router::new()
            .route("/authors", post(handlers::create_author::<AS>))
            .layer(
                ServiceBuilder::new()
                    .layer(TraceLayer::new_for_http())
                    .layer(TimeoutLayer::new(Duration::from_secs(10)))
                    .layer(CompressionLayer::new())
                    .layer(CorsLayer::new().allow_origin([origin]))
            )
            .with_state(state);
        let listener = TcpListener::bind(format!("0.0.0.0:{}", config.port)).await?;
        Ok(Self { router, listener })
    }
    pub async fn run(self) -> anyhow::Result<()> {
        axum::serve(self.listener, self.router).await?; Ok(())
    }
}

#[derive(Debug, Clone)]
struct AppState<AS: AuthorService> { author_service: Arc<AS> }
```

## Inbound: Auth Middleware

```rust
// src/inbound/http/middleware.rs
pub async fn require_auth<AS: AuthorService>(
    State(state): State<AppState<AS>>,
    mut req: Request,
    next: Next,
) -> Result<Response, ApiError> {
    let token = req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .ok_or(ApiError::Unauthorized)?;
    let user = verify_token(token).await?.ok_or(ApiError::Unauthorized)?;
    req.extensions_mut().insert(user);
    Ok(next.run(req).await)
}

// Apply to routes
Router::new()
    .route("/authors", post(create_author::<AS>))
    .route_layer(middleware::from_fn_with_state(state.clone(), require_auth::<AS>))
```

## Inbound: Request / Response

```rust
// src/inbound/http/authors/request.rs
#[derive(Debug, Deserialize)]
pub struct CreateAuthorHttpRequestBody { pub name: String }

impl CreateAuthorHttpRequestBody {
    pub fn try_into_domain(self) -> Result<CreateAuthorRequest, AuthorNameEmptyError> {
        Ok(CreateAuthorRequest::new(AuthorName::new(&self.name)?))
    }
}

// src/inbound/http/authors/response.rs
#[derive(Debug, Serialize)]
pub struct AuthorResponseData { pub id: String, pub name: String }

impl From<&Author> for AuthorResponseData {
    fn from(a: &Author) -> Self {
        Self { id: a.id().to_string(), name: a.name().to_string() }
    }
}
```

## Inbound: Handler

```rust
// src/inbound/http/authors/handlers.rs
pub async fn create_author<AS: AuthorService>(
    State(state): State<AppState<AS>>,
    Json(body): Json<CreateAuthorHttpRequestBody>,
) -> Result<ApiSuccess<AuthorResponseData>, ApiError> {
    let domain_req = body.try_into_domain()?;
    state.author_service.create_author(&domain_req).await
        .map_err(ApiError::from)
        .map(|ref author| ApiSuccess::new(StatusCode::CREATED, author.into()))
}
```

## Inbound: API Error (RFC 9457)

```rust
// src/inbound/http/error.rs
#[derive(Debug)]
pub enum ApiError {
    InternalServerError(String),
    UnprocessableEntity(String),
    NotFound,
    Unauthorized,
}

// Map domain errors manually — never leak domain strings
impl From<CreateAuthorError> for ApiError {
    fn from(e: CreateAuthorError) -> Self {
        match e {
            CreateAuthorError::Duplicate { name } =>
                Self::UnprocessableEntity(format!("author with name {} already exists", name)),
            CreateAuthorError::Unknown(cause) => {
                tracing::error!("{:?}\n{}", cause, cause.backtrace());
                Self::InternalServerError("An unexpected error occurred".into())
            }
        }
    }
}

impl From<AuthorNameEmptyError> for ApiError {
    fn from(_: AuthorNameEmptyError) -> Self {
        Self::UnprocessableEntity("author name cannot be empty".into())
    }
}

// RFC 9457 ProblemDetails
#[derive(Serialize)]
struct ProblemDetails { r#type: String, title: String, status: u16, detail: String }

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, problem) = match &self {
            Self::NotFound => (StatusCode::NOT_FOUND, "not-found", "Not Found"),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized", "Unauthorized"),
            Self::UnprocessableEntity(_) =>
                (StatusCode::UNPROCESSABLE_ENTITY, "unprocessable-entity", "Unprocessable Entity"),
            Self::InternalServerError(_) =>
                (StatusCode::INTERNAL_SERVER_ERROR, "internal-error", "Internal Server Error"),
        };
        let detail = match &self {
            Self::InternalServerError(_) => "An unexpected error occurred".into(),
            other => other.to_string(),
        };
        (status, Json(ProblemDetails {
            r#type: format!("https://api.example.com/errors/{}", problem),
            title: problem.into(), status: status.as_u16(), detail,
        })).into_response()
    }
}
```

## Inbound: Response Wrappers

```rust
// src/inbound/http/response.rs
pub struct ApiSuccess<T: Serialize> { status: StatusCode, data: T }

impl<T: Serialize> ApiSuccess<T> {
    pub fn new(status: StatusCode, data: T) -> Self { Self { status, data } }
}

impl<T: Serialize> IntoResponse for ApiSuccess<T> {
    fn into_response(self) -> Response {
        (self.status, Json(self.data)).into_response()
    }
}

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

---

## Bootstrap

```rust
// src/bin/server/main.rs — no axum, no sqlx imports
use myapp::domain::authors::service::AuthorServiceImpl;
use myapp::inbound::http::{HttpServer, HttpServerConfig};
use myapp::outbound::{sqlite::Sqlite, prometheus::Prometheus, email_client::EmailClient};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = Config::from_env()?;
    tracing_subscriber::fmt::init();
    let sqlite = Sqlite::new(&config.database_url).await?;
    let service = AuthorServiceImpl::new(sqlite, Prometheus::new(), EmailClient::new());
    HttpServer::new(service, HttpServerConfig { port: &config.server_port }).await?.run().await
}
```

## CI/CD

```bash
cargo sqlx prepare && git add .sqlx/    # offline builds
SQLX_OFFLINE=true cargo build           # CI without DB
```

---

## Testing: Hexagonal Mock Patterns

### Strategy

| Layer | Mock | Test |
|-------|------|------|
| Handler | Service | Parse input, map success/error to HTTP |
| Service | Repo, Metrics, Notifier | Orchestration logic, side effects |
| Adapter | Nothing (real DB) | SQL, error mapping, transactions |
| E2E | Nothing | Full request → response |

### Mock trait pattern

`Arc<Mutex<Result>>` needed because `Clone` bound + `anyhow::Error` isn't `Clone`.

```rust
#[derive(Clone)]
struct MockAuthorService {
    create_result: Arc<Mutex<Result<Author, CreateAuthorError>>>,
}

impl AuthorService for MockAuthorService {
    async fn create_author(&self, _: &CreateAuthorRequest) -> Result<Author, CreateAuthorError> {
        let mut guard = self.create_result.lock().await;
        let mut result = Err(CreateAuthorError::Unknown(anyhow!("placeholder")));
        mem::swap(guard.deref_mut(), &mut result);
        result
    }
}
```

### Side-effect counting with atomics

```rust
#[derive(Clone)]
struct MockMetrics { success: Arc<AtomicU32>, failure: Arc<AtomicU32> }

impl AuthorMetrics for MockMetrics {
    async fn record_creation_success(&self) { self.success.fetch_add(1, Ordering::SeqCst); }
    async fn record_creation_failure(&self) { self.failure.fetch_add(1, Ordering::SeqCst); }
}
```

### Integration test with `#[sqlx::test]`

```rust
#[sqlx::test]
async fn sqlite_duplicate_returns_domain_error(pool: SqlitePool) {
    let repo = Sqlite::from_pool(pool);
    let req = CreateAuthorRequest::new(AuthorName::new("Dup").unwrap());
    repo.create_author(&req).await.unwrap();
    let err = repo.create_author(&req).await.unwrap_err();
    assert!(matches!(err, CreateAuthorError::Duplicate { .. }));
}
```

### E2E with `tower::ServiceExt::oneshot`

```rust
async fn test_app() -> Router {
    let pool = setup_test_db().await;
    let service = AuthorServiceImpl::new(Sqlite::from_pool(pool), NoOpMetrics, NoOpNotifier);
    HttpServer::router(service)
}

#[tokio::test]
async fn e2e_create_author() {
    let app = test_app().await;
    let res = app.oneshot(
        Request::post("/authors")
            .header("Content-Type", "application/json")
            .body(Body::from(r#"{"name":"Test"}"#)).unwrap(),
    ).await.unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
}
```

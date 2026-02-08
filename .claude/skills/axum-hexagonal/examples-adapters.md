# Examples: Adapters

Inbound (HttpServer, handlers, auth, errors) and outbound (SQLite, Postgres, mapper).

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

impl Postgres {
    pub async fn new(url: &str) -> anyhow::Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(Duration::from_secs(3))
            .connect(url).await
            .with_context(|| format!("failed to connect to {}", url))?;
        Ok(Self { pool })
    }
    pub fn from_pool(pool: sqlx::PgPool) -> Self { Self { pool } }
}

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
    // find_author omitted — same pattern as SQLite
}
```

## Outbound: Row ↔ Domain Mapper (for complex rows or ORM)

```rust
// src/outbound/mapper.rs — use when rows have many fields or when using diesel/sea-orm
#[derive(Debug, sqlx::FromRow)]
pub struct AuthorRow { pub id: String, pub name: String }

impl AuthorRow {
    pub fn to_domain(self) -> Result<Author, anyhow::Error> {
        Ok(Author::new(
            Uuid::parse_str(&self.id)?,
            AuthorName::new(&self.name).map_err(|e| anyhow!(e))?,
        ))
    }
}

// Usage in adapter:
let row: Option<AuthorRow> = sqlx::query_as!(AuthorRow,
    "SELECT id, name FROM authors WHERE id = $1", id_str)
    .fetch_optional(&self.pool).await?;
row.map(|r| r.to_domain()).transpose()
```

---

## Inbound: HttpServer Wrapper

```rust
// src/inbound/http/server.rs
pub struct HttpServer { router: Router, listener: TcpListener }

#[derive(Debug, Clone)]
struct AppState<AS: AuthorService> { author_service: Arc<AS> }

impl HttpServer {
    pub async fn new<AS: AuthorService>(
        author_service: AS, config: HttpServerConfig<'_>,
    ) -> anyhow::Result<Self> {
        let router = Self::build_router(author_service, config)?;
        let listener = TcpListener::bind(format!("0.0.0.0:{}", config.port)).await?;
        Ok(Self { router, listener })
    }

    /// For tests: returns Router without binding a port.
    pub fn build_router<AS: AuthorService>(
        author_service: AS, config: HttpServerConfig<'_>,
    ) -> anyhow::Result<Router> {
        let state = AppState { author_service: Arc::new(author_service) };
        let origin = config.cors_origin.parse::<HeaderValue>()?;
        Ok(Router::new()
            .route("/authors", post(handlers::create_author::<AS>))
            .layer(
                ServiceBuilder::new()
                    .layer(TraceLayer::new_for_http())
                    .layer(TimeoutLayer::new(Duration::from_secs(10)))
                    .layer(CompressionLayer::new())
                    .layer(CorsLayer::new().allow_origin([origin]))
            )
            .with_state(state))
    }

    pub async fn run(self) -> anyhow::Result<()> {
        axum::serve(self.listener, self.router).await?;
        Ok(())
    }
}
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

// Apply per-route
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
    fn into_response(self) -> Response { (self.status, Json(self.data)).into_response() }
}

pub struct Created<T>(pub T);
pub struct Ok<T>(pub T);
pub struct NoContent;

impl<T: Serialize> IntoResponse for Created<T> {
    fn into_response(self) -> Response { (StatusCode::CREATED, Json(self.0)).into_response() }
}
impl<T: Serialize> IntoResponse for Ok<T> {
    fn into_response(self) -> Response { Json(self.0).into_response() }
}
impl IntoResponse for NoContent {
    fn into_response(self) -> Response { StatusCode::NO_CONTENT.into_response() }
}
```

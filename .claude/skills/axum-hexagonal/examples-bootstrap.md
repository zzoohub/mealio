# Examples: Bootstrap & Testing

main.rs, CI, and hex-specific test mocks.

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

## Testing: Hex-Specific Mocks

### Strategy

| Layer | Mock | What to test |
|-------|------|--------------|
| Handler | Mock service | HTTP parsing, status codes, error format |
| Service | Mock repo/metrics/notifier | Orchestration, side-effect ordering |
| Adapter | Real DB | SQL, error mapping, transactions |
| E2E | Nothing mocked | Critical happy paths |

### Stub — returns configured results

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

### Saboteur — always fails

```rust
#[derive(Clone)]
struct SaboteurRepository;

impl AuthorRepository for SaboteurRepository {
    async fn create_author(&self, _: &CreateAuthorRequest) -> Result<Author, CreateAuthorError> {
        Err(anyhow!("db on fire").into())
    }
    async fn find_author(&self, _: &Uuid) -> Result<Option<Author>, anyhow::Error> {
        Err(anyhow!("db on fire"))
    }
}
```

### Spy — side-effect counting

```rust
#[derive(Clone)]
struct SpyMetrics { success: Arc<AtomicU32>, failure: Arc<AtomicU32> }

impl AuthorMetrics for SpyMetrics {
    async fn record_creation_success(&self) { self.success.fetch_add(1, Ordering::SeqCst); }
    async fn record_creation_failure(&self) { self.failure.fetch_add(1, Ordering::SeqCst); }
}
```

### NoOp — for E2E tests

```rust
#[derive(Clone)]
struct NoOpMetrics;
impl AuthorMetrics for NoOpMetrics {
    async fn record_creation_success(&self) {}
    async fn record_creation_failure(&self) {}
}

#[derive(Clone)]
struct NoOpNotifier;
impl AuthorNotifier for NoOpNotifier {
    async fn author_created(&self, _: &Author) {}
}
```

### Test app helper

```rust
async fn test_app() -> Router {
    let pool = setup_test_db().await;
    let service = AuthorServiceImpl::new(Sqlite::from_pool(pool), NoOpMetrics, NoOpNotifier);
    HttpServer::build_router(service, test_config()).unwrap()
}

// Use with tower::ServiceExt::oneshot
let app = test_app().await;
let res = app.oneshot(
    Request::post("/authors")
        .header("Content-Type", "application/json")
        .body(Body::from(r#"{"name":"Test"}"#)).unwrap(),
).await.unwrap();
assert_eq!(res.status(), StatusCode::CREATED);
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

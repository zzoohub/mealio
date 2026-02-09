---
name: axum-hexagonal
description: |
  Axum 0.8+ with hexagonal architecture patterns in Rust.
  Use when: building Rust APIs that need testability, maintainability, and scalability.
  Covers: domain modeling, ports & adapters, service layer, error handling, testing.
  Do not use for: API design decisions (use api-design skill), thin CRUD apps (use axum skill).
  Workflow: api-design (design) → this skill (implementation).
references:
  - examples-domain.md
  - examples-adapters.md
  - examples-bootstrap.md
---

# Axum + Hexagonal Architecture

**For latest Axum/SQLx APIs, use context7.**

## Core Philosophy

Separate **business domain** from **infrastructure**. Domain defines *what*; adapters decide *how*.

```
[Inbound Adapter: HTTP handler] → [Port: Service trait] → [Domain Logic]
    → [Port: Repository trait] → [Outbound Adapter: SQLx/Redis/etc.]
```

**Dependencies always point inward.** Domain code never imports axum, sqlx, or any infrastructure crate.

---

## Project Structure

```
src/
├── bin/server/main.rs           # Bootstrap only — no axum/sqlx imports
├── config.rs
├── domain/
│   └── authors/
│       ├── models.rs            # Author, AuthorName, CreateAuthorRequest
│       ├── error.rs             # CreateAuthorError
│       ├── ports.rs             # AuthorRepository, AuthorService traits
│       └── service.rs           # Service<R, M, N> impl
├── inbound/http/
│   ├── server.rs                # HttpServer wrapper around axum
│   ├── error.rs                 # ApiError → RFC 9457
│   ├── response.rs              # ApiSuccess, Created, Ok, NoContent
│   └── authors/
│       ├── handlers.rs          # Parse → call service → map response
│       ├── request.rs           # CreateAuthorHttpRequestBody
│       └── response.rs          # AuthorResponseData
└── outbound/
    ├── sqlite.rs                # impl AuthorRepository for Sqlite
    ├── postgres.rs              # impl AuthorRepository for Postgres
    ├── prometheus.rs            # impl AuthorMetrics
    └── email_client.rs          # impl AuthorNotifier
.sqlx/                 # Commit this
```

**Rule:** `domain/` never imports from `inbound/` or `outbound/`.

---

## Domain Layer

### Models
- Validate on construction (newtype pattern). Private fields, public getters.
- No `serde::Deserialize` — Serde bypasses constructors, creating invalid objects.
  Exception: Serde is OK if the model performs no validation (any field value is valid).
- Separate `CreateAuthorRequest` from `Author` — they WILL diverge as app grows.

### Errors
- Exhaustive enum: one variant per business rule violation + `Unknown(anyhow::Error)`.
- Don't panic on unexpected errors — poisons mutexes, surprises other devs. Return errors.
- Domain errors = complete description of what can go wrong in an operation.

### Ports (Traits)

All port traits require: `Clone + Send + Sync + 'static`

```rust
fn method(&self, ...) -> impl Future<Output = Result<T, E>> + Send;
```

> `async fn` in traits doesn't auto-add `Send`. Spell it out for web apps.

Three categories: **Repository** (data), **Metrics** (observability), **Notifier** (side effects).

### Service
- Trait declaring business API + struct `Service<R, M, N>` implementing it.
- Orchestrates: repo → metrics → notifications → return result.
- Handlers call Service, never Repository directly.

---

## Inbound Layer

- **HttpServer wrapper** — wrap axum so `main` never imports axum.
  Expose `build_router()` for tests — returns `Router` without binding a port.
- **DI via State** — services wrapped in `Arc` inside `AppState<AS>`.
  Handler generic `AS: AuthorService` ensures dependency on trait, never concrete.
- **Handlers** do three things only: parse input → call service → map response. No SQL.
- **Request types** decoupled from domain — `try_into_domain()` validates into domain type.
- **Response types** built via `From<&Author>` — never expose domain structs.
- **API errors** mapped manually from domain errors. Never leak domain strings to users.
  `Unknown` → log server-side, return generic message. Use RFC 9457 ProblemDetails.
- **Middleware (Tower layers)** — lives in inbound layer, invisible to domain.
  Layers wrap services: `TraceLayer → TimeoutLayer → CompressionLayer → CorsLayer`.

---

## Outbound Layer

- Wrap connection pool in own type (`Sqlite`, `Postgres`).
- Expose `from_pool()` constructor for tests.
- **Transactions encapsulated in adapter**, invisible to callers.
- Keep transactions short. **No external calls (HTTP, queues) inside tx.**
- Map DB-specific errors (e.g. unique constraint codes) to domain error variants.
- Unknown DB errors wrapped with `anyhow` context.
- For complex row types or ORM (diesel, sea-orm), use explicit `to_domain()` mapper in outbound.
  For simple `sqlx::query!` rows, inline mapping in the adapter is fine.

### Query Method

| Situation | Method |
|-----------|--------|
| Must exist | `fetch_one` |
| May not exist | `fetch_optional` → map to domain `Option` or error |
| List | `fetch_all` |

### Pool Config

```rust
PgPoolOptions::new()
    .max_connections(10)
    .acquire_timeout(Duration::from_secs(3))  // Always set this
```

---

## Security

| Item | Value |
|------|-------|
| Password hashing | argon2id (64MB, 3 iter, 4 parallel) |
| JWT access token | 15-30 min |
| JWT refresh (web) | 90 days |
| JWT refresh (mobile) | 1 year |
| CORS | Explicit origins only |

Auth middleware lives in the inbound layer. Domain never handles raw tokens.

---

## Bootstrap (main.rs)

Construct adapters → assemble service → start server. **No axum/sqlx imports.**

```rust
let sqlite = Sqlite::new(&config.database_url).await?;
let service = AuthorServiceImpl::new(sqlite, metrics, notifier);
let server = HttpServer::new(service, HttpServerConfig { port: &config.port }).await?;
server.run().await
```

---

## Domain Boundaries

1. **Domain = tangible arm of your business** (blogging, billing, identity)
2. **Entities that change atomically → same domain**
3. **Cross-domain operations are never atomic** — service calls or async events
4. **Start large, decompose when friction is observed**

> If you leak transactions into business logic for cross-domain atomicity, your boundaries are wrong.

---

## Common Gotchas

| Problem | Cause | Fix |
|---------|-------|-----|
| `Future is not Send` | Async trait method missing `+ Send` | Use `impl Future<Output = ...> + Send` |
| `T is not Clone` | Port trait needs `Clone` bound | Wrap in `Arc` or derive `Clone` |
| `anyhow::Error` not `Clone` | Used in mock results | Wrap mock result in `Arc<Mutex<R>>` |
| Compile error on `sqlx::query!` | Missing `.sqlx/` offline data | Run `cargo sqlx prepare` |
| Handler can't extract `State` | Missing `.with_state(state)` | Add state to router |
| Middleware not running | Layer order wrong | `route_layer` for per-route, `layer` for global |
| Mutex poisoned | Panic while holding lock | Never panic — return errors |
| DB pool exhausted | No acquire timeout | Set `acquire_timeout(Duration::from_secs(3))` |

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Transactions? | Adapter (repository impl) |
| Validation? | Domain model constructors |
| Error mapping? | `From<DomainError> for ApiError` in inbound |
| Business orchestration? | Service impl |
| Handler responsibility? | Parse → service → response |
| main responsibility? | Construct adapters → assemble → start |
| DI mechanism? | `State<AppState<AS>>` with `Arc` |
| DB row ↔ domain? | `to_domain()` mapper in outbound |
| Test app? | `HttpServer::build_router()` + `tower::oneshot` |

---

## Checklist

- [ ] Response wrappers (`ApiSuccess`, `Created`, `Ok`, `NoContent`)
- [ ] RFC 9457 ProblemDetails error responses
- [ ] Domain models validate on construction, no `Deserialize`
- [ ] Domain errors exhaustive with `Unknown(anyhow::Error)`
- [ ] Port traits: `Clone + Send + Sync + 'static` with `+ Send` on futures
- [ ] Service encapsulates orchestration
- [ ] HTTP types separate from domain
- [ ] API errors mapped manually, never leaked
- [ ] Transactions in adapters only
- [ ] `main` has no axum/sqlx imports
- [ ] Axum wrapped in `HttpServer`
- [ ] `build_router()` exposed for tests
- [ ] Tower layers for middleware (trace, timeout, compression, CORS)
- [ ] Auth middleware in inbound layer
- [ ] `acquire_timeout` set on pool
- [ ] using compile time query check. and `.sqlx/` must be committed

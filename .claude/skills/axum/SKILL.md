---
name: axum
description: |
  Axum 0.8+ production patterns with SQLx.
  Use when: building Rust APIs, async database, error handling.
  Do not use for: API design decisions (use api-design skill).
  Workflow: api-design (design) → this skill (implementation).
references:
  - examples.md    # Transaction, testing, error handling patterns
---

# Axum + SQLx

**For latest axum APIs, use context7 MCP server with library-id `tokio-rs/axum`.**
**For latest sqlx APIs, use context7 MCP server with library-id `launchbadge/sqlx`.**
---

## Project Structure

```
src/
├── main.rs
├── config.rs
├── db.rs                # Pool setup
├── error.rs             # AppError + IntoResponse
└── features/
    └── users/
        ├── mod.rs
        ├── router.rs
        ├── handlers.rs
        ├── models.rs
        └── service.rs
migrations/
.sqlx/                   # Offline cache (COMMIT THIS)
```

---

## Critical Patterns

### State (Don't Double-Arc)

```rust
// PgPool is Arc internally - NEVER wrap again
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,  // ✅ Direct
    // pub db: Arc<PgPool>,  // ❌ Double Arc
}
```

**Rule: `PgPool` is already `Arc`. Wrapping again wastes memory.**

### Route Syntax (Axum 0.8+)

```rust
// ❌ Old syntax (0.7 and below)
.route("/users/:id", get(get_user))

// ✅ New syntax (0.8+)
.route("/users/{id}", get(get_user))
```

**Rule: Axum 0.8 uses `{id}`, not `:id`.**

### Transaction Dereference

```rust
let mut tx = state.db.begin().await?;

// ❌ Won't compile
sqlx::query!(...).fetch_one(tx).await?;

// ✅ Dereference with &mut *tx
sqlx::query!(...).fetch_one(&mut *tx).await?;

tx.commit().await?;
```

**Rule: Always use `&mut *tx` when passing transaction to queries.**

### Query Method Selection

| Method | Returns | Use when |
|--------|---------|----------|
| `fetch_one` | Row or `RowNotFound` | Row MUST exist |
| `fetch_optional` | `Option<Row>` | Row might not exist |
| `fetch_all` | `Vec<Row>` (empty ok) | List |

```rust
// ❌ Errors if user doesn't exist
let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
    .fetch_one(&state.db)
    .await?;

// ✅ Handle missing gracefully
let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;
```

**Rule: Use `fetch_optional` for lookups. `fetch_one` only when row must exist.**

---

## SQLx Type Mapping

| Postgres | Rust | Required Feature |
|----------|------|------------------|
| `UUID` | `uuid::Uuid` | `sqlx/uuid` |
| `TIMESTAMPTZ` | `chrono::DateTime<Utc>` | `sqlx/chrono` |
| `JSONB` | `serde_json::Value` | `sqlx/json` |
| `BIGINT` | `i64` | - |
| Nullable column | `Option<T>` | - |

**Rule: Nullable column must be `Option<T>`. Mismatch = runtime panic.**

---

## Offline Mode (CI/CD)

```bash
# 1. Generate cache locally (requires DATABASE_URL)
cargo sqlx prepare

# 2. Commit .sqlx/ directory
git add .sqlx/

# 3. In CI (no database needed)
SQLX_OFFLINE=true cargo build
```

**Rule: Always commit `.sqlx/`. Run `cargo sqlx prepare` before pushing.**

---

## Common Gotchas

| Problem | Cause | Fix |
|---------|-------|-----|
| Pool timeout | Connections exhausted | Add `acquire_timeout`, check long txns |
| Compile error (no DB) | DATABASE_URL missing | `cargo sqlx prepare` + `SQLX_OFFLINE=true` |
| RowNotFound | `fetch_one` on missing | Use `fetch_optional` |
| Checksum error | Migration modified | Never modify applied migrations |
| Type mismatch panic | Nullable without Option | Match nullability exactly |

### Pool Configuration

```rust
PgPoolOptions::new()
    .max_connections(10)
    .acquire_timeout(Duration::from_secs(3))  // Fail fast
    .idle_timeout(Duration::from_secs(600))
    .connect(database_url)
    .await?
```

**Rule: Always set `acquire_timeout`. Silent hangs are worse than errors.**

---

## Quick Checklist

### Syntax
- [ ] `{id}` for path params (not `:id`)
- [ ] `&mut *tx` for transactions

### SQLx
- [ ] `fetch_optional` for lookups
- [ ] Nullable columns are `Option<T>`
- [ ] `.sqlx/` committed
- [ ] `cargo sqlx prepare` before CI

### Pool
- [ ] No double Arc on PgPool
- [ ] `acquire_timeout` set
- [ ] Don't hold transactions long

### Errors
- [ ] `AppError` implements `IntoResponse`
- [ ] Map `sqlx::Error` to proper HTTP status

## Security Configuration

| Item | Value |
|------|-------|
| Password hashing | argon2id (64MB memory) or bcrypt 12 rounds |
| JWT access token | 1 hour |
| JWT refresh token (web) | 90 days |
| JWT refresh token (mobile) | 1 year |
| JWT algorithm | HS256 |
| CORS | Explicit origins only |

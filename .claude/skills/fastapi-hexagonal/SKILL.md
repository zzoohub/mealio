---
name: fastapi-hexagonal
description: |
  FastAPI with hexagonal architecture patterns in Python.
  Use when: building Python APIs that need testability, maintainability, and scalability.
  Covers: domain modeling, ports & adapters, service layer, error handling, async patterns, testing.
  Do not use for: API design decisions (use api-design skill), thin CRUD apps (use fastapi skill).
  Workflow: api-design (design) → this skill (implementation).
references:
  - examples-domain.md
  - examples-adapters.md
  - examples-bootstrap.md
---

# FastAPI + Hexagonal Architecture

**For latest FastAPI/Pydantic/SQLAlchemy APIs, use context7.**

## Core Philosophy

Separate **business domain** from **infrastructure**. Domain defines *what*; adapters decide *how*.

```
[Inbound Adapter: FastAPI router] → [Port: Service Protocol] → [Domain Logic]
    → [Port: Repository Protocol] → [Outbound Adapter: SQLAlchemy/Redis/etc.]
```

**Dependencies always point inward.** Domain code never imports FastAPI, SQLAlchemy, or any infrastructure package.

---

## Project Structure

```
src/
├── app/
│   ├── main.py                  # Bootstrap only — no FastAPI/SQLAlchemy imports
│   ├── application.py           # App orchestrator — runs Shell + workers via TaskGroup
│   └── config.py                # pydantic-settings
├── domain/
│   └── authors/
│       ├── models.py            # Author, AuthorName, CreateAuthorRequest
│       ├── errors.py            # DuplicateAuthorError, UnknownAuthorError
│       ├── ports.py             # AuthorRepository, AuthorService (Protocol)
│       └── service.py           # AuthorServiceImpl
├── inbound/
│   └── http/
│       ├── shell.py             # Shell class — wraps FastAPI, owns uvicorn
│       ├── errors.py            # exception handlers → RFC 9457
│       ├── dependencies.py      # with_author_service
│       ├── response.py          # ApiSuccess, Created, Ok, NoContent
│       └── authors/
│           ├── router.py        # Parse → call service → map response
│           ├── request.py       # CreateAuthorHttpRequestBody
│           └── response.py      # AuthorResponseData
├── outbound/
│   ├── postgres/
│   │   ├── repository.py       # impl AuthorRepository for Postgres
│   │   ├── models.py           # SQLAlchemy ORM models (outbound only)
│   │   └── mapper.py           # ORM ↔ domain translation
│   ├── sqlite/
│   │   └── repository.py       # impl AuthorRepository for SQLite
│   ├── prometheus.py            # impl AuthorMetrics
│   └── email_client.py          # impl AuthorNotifier
```

**Rule:** `domain/` never imports from `inbound/` or `outbound/`.

---

## Domain Layer

### Models
- Validate on construction (value object pattern). Use `@dataclass(frozen=True)`.
- **No ORM models in domain** — SQLAlchemy models live in `outbound/` only.
- Domain models may use Pydantic for validation, but MUST NOT use `from_attributes=True`.
- Separate `CreateAuthorRequest` from `Author` — they WILL diverge as app grows.

### Errors
- Exhaustive hierarchy: one class per business rule violation + generic `UnknownAuthorError`.
- **Never raise `HTTPException` in domain** — that leaks transport concerns.

### Ports (Protocols)

Use `typing.Protocol` for structural subtyping — no inheritance required from implementors.

Three categories: **Repository** (data), **Metrics** (observability), **Notifier** (side effects).

### Service
- `Protocol` declaring business API + class `AuthorServiceImpl` implementing it.
- Orchestrates: repo → metrics → notifications → return result.
- Handlers call Service, never Repository directly.

---

## Inbound Layer

- **Shell class** — wraps FastAPI + uvicorn so `main.py` never imports them.
  Expose `build_test_app()` for tests — returns ASGI app without uvicorn.
- **Use `lifespan` context manager**, not deprecated `@app.on_event`.
- **DI via lifespan state** — `yield {"author_service": service}` → `request.state.author_service`.
  Uses ASGI spec `request.state` — framework-agnostic.
- **Handlers** do three things only: parse input → call service → map response. No SQL. No ORM.
- **Request types** decoupled from domain — `try_into_domain()` validates into domain type.
- **Response types** built via `from_domain()` classmethod — never expose domain models directly.
- **API errors** mapped via `@app.exception_handler`. Never leak domain strings to users.
  `UnknownAuthorError` → log server-side, return generic message. Use RFC 9457 ProblemDetails.
- **Middleware** — lives in inbound layer, invisible to domain.
  **CORS middleware before routers** (order matters).

---

## Outbound Layer

- Wrap engine/session factory in own class (`PostgresAuthorRepository`).
- Expose `from_engine()` constructor for tests.
- **Transactions encapsulated in adapter**, invisible to callers.
- Keep transactions short. **No external calls (HTTP, queues) inside tx.**
- Map DB-specific errors (e.g. `IntegrityError`) to domain error types.
- ORM models live in `outbound/`. Use explicit mapper (`AuthorMapper.to_domain()`) to translate.
  For raw SQL adapters, inline mapping is fine.

### Async Safety (Critical)

```python
# ❌ Blocks entire event loop
async def bad():
    time.sleep(5)          # blocks!
    requests.get(...)      # sync HTTP!

# ✅ Proper async
async def good():
    await asyncio.sleep(5)
    async with httpx.AsyncClient() as client:
        await client.get(...)
```

**Rule: In async routes, ALL I/O must be async. For sync libs, use `def` (thread pool).**

### SQLAlchemy Async

| Setting | Value | Why |
|---------|-------|-----|
| `expire_on_commit` | `False` | Prevents detached instance errors |
| Relationship loading | `selectinload()` | Lazy loading fails in async |
| Session scope | Per-request in adapter | Adapter creates/closes session |

### Pool Config

```python
create_async_engine(url, pool_size=10, pool_timeout=3, pool_pre_ping=True)
```

---

## App Orchestrator

For apps with background workers, use `Application` class with `asyncio.TaskGroup`.
`TaskGroup` cancels sibling tasks on failure. HTTP-only apps can skip this.

---

## Security

| Item | Value |
|------|-------|
| Password hashing | bcrypt, 12 rounds |
| JWT access token | 15-30 min |
| JWT refresh (web) | 90 days |
| JWT refresh (mobile) | 1 year |
| CORS | Explicit origins only (no wildcard) |

Auth dependency (`get_current_user`) lives in inbound layer. Domain never handles raw tokens.

---

## Bootstrap (main.py)

Construct adapters → assemble service → start. **No FastAPI/SQLAlchemy imports.**

Package management: `uv`. Commit `uv.lock`. Use `uv run` to execute.

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
| 422 Unprocessable | Schema mismatch | Test in `/docs` first |
| CORS not working | Middleware order | Add CORS before routers |
| All requests hang | Blocking in async | No `time.sleep()`, use `await` |
| "Field required" | Optional without default | `str \| None = None` |
| Detached instance | Session closed | `expire_on_commit=False` |
| Lazy load error | Async SQLAlchemy | Use `selectinload()` |
| Domain imports FastAPI | Leaky boundary | Move to inbound layer |
| HTTPException in domain | Transport leak | Use domain error classes |
| ORM model in handler | Missing mapper | Translate in adapter via mapper |

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Transactions? | Adapter (repository impl) |
| Validation? | Domain model constructors / value objects |
| Error mapping? | `@app.exception_handler` in inbound |
| Business orchestration? | Service impl |
| Handler responsibility? | Parse → service → response |
| main responsibility? | Construct adapters → assemble → start |
| DI mechanism? | Lifespan state + `request.state` |
| ORM ↔ domain? | `AuthorMapper.to_domain()` in outbound |
| Test app? | `Shell.build_test_app()` + `httpx.AsyncClient` |
| Background workers? | `Application` + `asyncio.TaskGroup` |

---

## Checklist

- [ ] `uv.lock` committed
- [ ] Response wrappers (`ApiSuccess`, `Created`, `Ok`, `NoContent`)
- [ ] RFC 9457 ProblemDetails error responses
- [ ] Domain models validate on construction, no ORM coupling
- [ ] Domain errors exhaustive with `UnknownAuthorError`
- [ ] Port traits as `Protocol` classes
- [ ] Service encapsulates orchestration
- [ ] HTTP schemas separate from domain models
- [ ] API errors mapped via exception handlers, never leaked
- [ ] Transactions in adapters only
- [ ] ORM ↔ domain mapper in outbound layer
- [ ] `main.py` has no FastAPI/SQLAlchemy imports
- [ ] FastAPI wrapped in `Shell`
- [ ] `build_test_app()` exposed for tests
- [ ] `lifespan` context manager (not `on_event`)
- [ ] `expire_on_commit=False` in async sessions
- [ ] `selectinload()` for relationships
- [ ] No blocking calls in async routes
- [ ] CORS middleware before routers
- [ ] Auth dependency in inbound layer
- [ ] `pool_timeout` set on engine

---
name: fastapi
description: |
  FastAPI production patterns with Pydantic v2 and SQLAlchemy async.
  Use when: setup or building Python APIs, async database, JWT auth.
  Do not use for: API design decisions (use api-design skill).
  Workflow: api-design (design) → this skill (implementation).
references:
  - examples.md    # JWT auth, testing patterns
---

# FastAPI

**For latest FastAPI/Pydantic APIs, use context7.**

---

## Project Structure

```
src/
├── app/
│   ├── main.py              # FastAPI app, lifespan
│   └── config.py            # pydantic-settings
├── features/
│   ├── auth/
│   │   ├── router.py
│   │   ├── schemas.py       # Pydantic models
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── service.py       # JWT, password
│   │   └── dependencies.py  # get_current_user
│   └── items/
│       └── ...
├── shared/
│   ├── database.py
│   └── exceptions.py
└── tests/
```

---

## Critical Patterns

### Pydantic v2 + SQLAlchemy

```python
class ItemResponse(BaseModel):
    id: int
    name: str
    
    model_config = ConfigDict(from_attributes=True)  # Required for ORM
```

**Rule: Always use `from_attributes=True` for ORM model conversion.**

### Database Session

```python
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

**Rule: `expire_on_commit=False` prevents detached instance errors.**

### Lifespan (App Lifecycle)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown (cleanup here)

app = FastAPI(lifespan=lifespan)
```

**Rule: Use lifespan, not deprecated `@app.on_event`.**

### Eager Loading (N+1 Prevention)

```python
# ❌ Lazy loading fails in async
user.items  # Raises MissingGreenlet error

# ✅ Eager load with selectinload
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(User).options(selectinload(User.items))
)
```

**Rule: Always use `selectinload()` for relationships in async.**

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

### Async Blocking (Critical)

```python
# ❌ Blocks entire event loop
@app.get("/")
async def bad():
    time.sleep(5)
    requests.get(...)  # sync HTTP

# ✅ Proper async
@app.get("/")
async def good():
    await asyncio.sleep(5)
    async with httpx.AsyncClient() as client:
        await client.get(...)
```

**Rule: In async routes, ALL I/O must be async. For sync libs, use sync def (thread pool).**

### 422 Debugging

```python
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )
```

---

## Quick Checklist

### Setup
- [ ] `lifespan` context manager (not on_event)
- [ ] `expire_on_commit=False` in session
- [ ] CORS middleware before routers

### Async Safety
- [ ] No blocking calls in async routes
- [ ] `selectinload()` for relationships
- [ ] httpx/aiohttp for HTTP calls (not requests)

### Validation
- [ ] `from_attributes=True` for ORM schemas
- [ ] `str | None = None` for optional fields
- [ ] Separate Create/Update/Response schemas

### Auth
- [ ] `OAuth2PasswordBearer` for JWT
- [ ] `Depends(get_current_user)` on protected routes

## Security Configuration

| Item | Value |
|------|-------|
| Password hashing | bcrypt, 12 rounds |
| JWT access token | 1 hour |
| JWT refresh token (web) | 90 days |
| JWT refresh token (mobile) | 1 year |
| JWT algorithm | HS256 |
| Rate limit (auth) | 5/min |
| Rate limit (API) | 100/min |
| CORS | Explicit origins only (no wildcard) |

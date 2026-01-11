---
name: fastapi
description: |
  Build Python APIs with FastAPI, Pydantic v2, and SQLAlchemy 2.0 async. Covers project structure, JWT auth, validation, and database integration.
  Use when: creating Python APIs, implementing JWT auth, or troubleshooting 422 validation, CORS, or async blocking errors.
---

# FastAPI Skill

Production patterns for FastAPI with Pydantic v2, SQLAlchemy 2.0 async, and JWT authentication.

**For basic syntax and latest API changes, use `context7` MCP.**

---

## Quick Start

```bash
# Create project with uv
uv init my-api && cd my-api
uv add fastapi[standard] sqlalchemy[asyncio] aiosqlite python-jose[cryptography] passlib[bcrypt]
uv run fastapi dev src/main.py
```

Docs at: `http://127.0.0.1:8000/docs`

---

## Project Structure (Domain-Based)

```
my-api/
├── pyproject.toml
├── src/
│   ├── main.py              # FastAPI app, lifespan, routers
│   ├── config.py            # Settings (pydantic-settings)
│   ├── database.py          # Async SQLAlchemy setup
│   ├── auth/                # Auth domain
│   │   ├── router.py        # /auth endpoints
│   │   ├── schemas.py       # Pydantic models
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── service.py       # JWT, password hashing
│   │   └── dependencies.py  # get_current_user
│   ├── items/               # Feature domain
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── models.py
│   │   └── service.py
│   └── shared/
│       └── exceptions.py
└── tests/
```

---

## Core Patterns

### Pydantic Schemas

```python
from pydantic import BaseModel, Field, ConfigDict

class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., gt=0)
    description: str | None = None  # Optional with default

class ItemResponse(ItemCreate):
    id: int
    
    model_config = ConfigDict(from_attributes=True)  # For SQLAlchemy
```

**Key points:**
- Separate Create/Update/Response schemas
- `from_attributes=True` for ORM conversion
- Use `str | None = None` not `Optional[str]`

### SQLAlchemy Models (Async 2.0)

```python
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase

class Base(DeclarativeBase):
    pass

class Item(Base):
    __tablename__ = "items"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    price: Mapped[float]
```

### Database Setup

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine("sqlite+aiosqlite:///./db.sqlite")
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

### Router Pattern

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

router = APIRouter(prefix="/items", tags=["items"])

@router.get("", response_model=list[ItemResponse])
async def list_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item))
    return result.scalars().all()

@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(item_in: ItemCreate, db: AsyncSession = Depends(get_db)):
    item = Item(**item_in.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item
```

### Main App

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(items_router)
```

---

## JWT Authentication

### Service Layer

```python
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"])

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=30)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, "HS256")
```

### Auth Dependency

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

### Protect Routes

```python
@router.post("/items")
async def create_item(
    item_in: ItemCreate,
    current_user: User = Depends(get_current_user),  # Auth required
    db: AsyncSession = Depends(get_db)
):
    ...
```

---

## Configuration

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./db.sqlite"
    SECRET_KEY: str
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Common Errors & Fixes

### 422 Unprocessable Entity

**Cause**: Request doesn't match Pydantic schema

**Debug**: Test in `/docs` first, check required fields

**Fix**: Better error details
```python
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_handler(request, exc):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})
```

### CORS Errors

**Cause**: Missing/misconfigured middleware

**Fix**: Add before routers, specify exact origins in production
```python
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], ...)
```

### Async Blocking (All Requests Hang)

**Cause**: Blocking call in async route

```python
# ❌ Blocks event loop
@app.get("/")
async def bad():
    time.sleep(5)  # WRONG

# ✅ Non-blocking
@app.get("/")
async def good():
    await asyncio.sleep(5)
```

**Rule**: In async routes, all I/O must be async. For CPU-bound work, use sync route (runs in thread pool).

### "Field Required" for Optional Fields

```python
# ❌ Still required (no default)
description: str | None

# ✅ Optional
description: str | None = None
```

### SQLAlchemy Async Pitfalls

```python
# ❌ Lazy loading fails in async
user.items  # Raises error

# ✅ Eager load
from sqlalchemy.orm import selectinload
result = await db.execute(select(User).options(selectinload(User.items)))
```

---

## Testing

```python
import pytest
from httpx import AsyncClient, ASGITransport

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_create_item(client):
    response = await client.post("/items", json={"name": "Test", "price": 9.99})
    assert response.status_code == 201
```

Run: `uv run pytest`

---

## Critical Rules

### Always
- Separate Pydantic schemas from SQLAlchemy models
- Use async for all I/O in async routes
- Use `Depends()` for database, auth
- Return proper status codes (201 create, 204 delete)

### Never
- Blocking calls in async routes (`time.sleep`, sync DB)
- Business logic in routes (use service layer)
- Hardcode secrets (use env vars)
- `allow_origins=["*"]` in production CORS

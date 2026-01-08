---
name: fastapi
description: FastAPI framework patterns including project structure, async routes, Pydantic/SQLModel, dependency injection, and testing. For API design principles (REST endpoints, pagination, error formats), see api-design skill.
---

# FastAPI Framework Patterns

FastAPI-specific implementation patterns. For API design principles, see `api-design` skill.

## When to Use This Skill

- Setting up FastAPI project structure
- Implementing async routes
- Using Pydantic and SQLModel
- Building dependency injection chains
- Writing tests for FastAPI

---

## 1. Project Structure

### Domain-Driven Structure

```
fastapi-project/
├── alembic/                    # Database migrations
├── src/
│   ├── auth/
│   │   ├── router.py           # API endpoints
│   │   ├── schemas.py          # Pydantic models
│   │   ├── models.py           # SQLModel tables
│   │   ├── dependencies.py     # Route dependencies
│   │   ├── service.py          # Business logic
│   │   └── exceptions.py
│   ├── users/
│   │   └── ...
│   ├── config.py               # Global config
│   ├── database.py             # DB connection
│   ├── exceptions.py           # Global exceptions
│   └── main.py                 # FastAPI app
├── tests/
│   ├── auth/
│   ├── users/
│   └── conftest.py
├── pyproject.toml
└── .env
```

### Main App Setup

```python
# src/main.py
from fastapi import FastAPI
from src.users.router import router as users_router
from src.auth.router import router as auth_router

app = FastAPI(
    title="My API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
```

### Router Setup

```python
# src/users/router.py
from fastapi import APIRouter, status

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=list[UserRead])
async def list_users(session: DbSession):
    return await get_users(session)

@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, session: DbSession):
    return await create_user(session, user)
```

---

## 2. Async Patterns

### When to Use Async vs Sync

| Situation | Use |
|-----------|-----|
| Database (async driver) | `async def` |
| HTTP calls (httpx) | `async def` |
| File I/O | `def` (sync) or `aiofiles` |
| CPU-intensive | `def` (sync) |
| Sync library | `def` (sync) |

### Async Route Examples

```python
# ❌ Bad - Blocks event loop
@router.get("/bad")
async def bad_endpoint():
    time.sleep(10)  # Blocks everything!
    return {"status": "done"}

# ✅ Good - Sync function runs in thread pool
@router.get("/good-sync")
def good_sync_endpoint():
    time.sleep(10)  # Runs in thread pool
    return {"status": "done"}

# ✅ Best - Async with non-blocking I/O
@router.get("/best-async")
async def best_async_endpoint():
    await asyncio.sleep(10)  # Non-blocking
    return {"status": "done"}
```

---

## 3. Pydantic & SQLModel

### Pydantic Schemas

```python
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    role: UserRole = UserRole.USER

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError("Username must be alphanumeric")
        return v.lower()

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserRead(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(None, min_length=3, max_length=50)
```

### SQLModel (Pydantic + SQLAlchemy)

```python
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime

# Base model (no table)
class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    username: str = Field(min_length=3, max_length=50)
    is_active: bool = Field(default=True)

# Table model
class User(UserBase, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    posts: list["Post"] = Relationship(back_populates="author")
```

---

## 4. Dependencies

### Database Session

```python
# database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from typing import Annotated
from fastapi import Depends

DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

# Type alias
DbSession = Annotated[AsyncSession, Depends(get_session)]
```

### Auth Dependencies Chain

```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: DbSession = None
) -> User:
    payload = decode_token(token)
    user = await session.get(User, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

async def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    return user

async def require_admin(
    user: User = Depends(get_current_active_user)
) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin required")
    return user

# Type aliases for cleaner routes
CurrentUser = Annotated[User, Depends(get_current_active_user)]
AdminUser = Annotated[User, Depends(require_admin)]
```

### Resource Validation Dependencies

```python
async def valid_user_id(user_id: int, session: DbSession) -> User:
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def valid_owned_post(
    post_id: int,
    user: CurrentUser,
    session: DbSession
) -> Post:
    post = await session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    return post

# Usage
@router.get("/users/{user_id}")
async def get_user(user: User = Depends(valid_user_id)):
    return user

@router.put("/posts/{post_id}")
async def update_post(
    data: PostUpdate,
    post: Post = Depends(valid_owned_post),
    session: DbSession = None
):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(post, key, value)
    session.add(post)
    await session.commit()
    return post
```

---

## 5. Database Operations

### CRUD with SQLModel

```python
from sqlmodel import select

# Create
async def create_user(session: DbSession, data: UserCreate) -> User:
    user = User(
        **data.model_dump(exclude={"password"}),
        hashed_password=hash_password(data.password)
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

# Read
async def get_user(session: DbSession, user_id: int) -> User | None:
    return await session.get(User, user_id)

# Update
async def update_user(session: DbSession, user: User, data: UserUpdate) -> User:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

# Delete
async def delete_user(session: DbSession, user: User) -> None:
    await session.delete(user)
    await session.commit()
```

### Complex Queries

```python
from sqlmodel import select, func, and_, desc

# Join with aggregation
async def get_users_with_post_count(session: DbSession):
    stmt = (
        select(User.id, User.username, func.count(Post.id).label("post_count"))
        .outerjoin(Post, User.id == Post.author_id)
        .group_by(User.id)
        .order_by(desc("post_count"))
    )
    result = await session.exec(stmt)
    return result.all()

# Dynamic filtering
async def search_posts(
    session: DbSession,
    query: str | None = None,
    author_id: int | None = None
) -> list[Post]:
    stmt = select(Post)
    conditions = []

    if query:
        conditions.append(Post.title.ilike(f"%{query}%"))
    if author_id:
        conditions.append(Post.author_id == author_id)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    result = await session.exec(stmt)
    return result.all()
```

---

## 6. Configuration

```python
# src/config.py
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # App
    DEBUG: bool = False
    APP_NAME: str = "My API"

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = Field(default=10)

    # Auth
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 30

settings = Settings()
```

---

## 7. Background Tasks

```python
from fastapi import BackgroundTasks

def send_email(email: str, message: str):
    # Sync function runs in thread pool
    print(f"Sending email to {email}: {message}")

@router.post("/users")
async def create_user(
    user: UserCreate,
    background_tasks: BackgroundTasks,
    session: DbSession
):
    db_user = await create_user(session, user)
    background_tasks.add_task(send_email, user.email, "Welcome!")
    return db_user
```

---

## 8. Testing

### Test Setup

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel import SQLModel
from src.main import app
from src.database import engine, async_session

@pytest.fixture
async def session():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        async with async_session() as session:
            yield session
        await conn.run_sync(SQLModel.metadata.drop_all)

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
```

### Test Examples

```python
import pytest

@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/users",
        json={"email": "test@example.com", "username": "testuser", "password": "password123"}
    )
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient):
    response = await client.get("/api/v1/users/999")
    assert response.status_code == 404
```

---

## Best Practices

1. **Async for I/O** - Use `async def` for database/HTTP, `def` for CPU-bound
2. **Domain structure** - Organize by feature (users/, posts/), not type
3. **Dependencies** - Use `Depends()` for reusable validation/auth logic
4. **Type aliases** - `DbSession`, `CurrentUser` for cleaner route signatures
5. **Thin routes** - Business logic in services, validation in dependencies

## Related Skills

- For API design (REST patterns, pagination, error formats): `api-design`
- For architecture patterns: `architecture-patterns`

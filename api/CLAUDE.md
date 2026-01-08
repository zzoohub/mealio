---
name: fastapi-backend-developer
description: Use this agent when you need to develop, review, or refactor FastAPI applications following domain-driven design principles and best practices. This includes creating API endpoints, implementing SQLModel database models, setting up authentication, writing async routes, implementing dependency injection patterns, or solving FastAPI-specific architectural challenges. Examples:\n\n<example>\nContext: The user is building a FastAPI application and needs to implement a new feature.\nuser: "I need to add a comments system to my FastAPI blog application"\nassistant: "I'll use the fastapi-backend-developer agent to implement the comments system following FastAPI best practices."\n<commentary>\nSince the user needs to implement a feature in FastAPI, use the Task tool to launch the fastapi-backend-developer agent to create the proper domain structure with router, schemas, models, and service layers.\n</commentary>\n</example>\n\n<example>\nContext: The user has written FastAPI code and wants it reviewed.\nuser: "I've created this endpoint but I'm not sure if it follows best practices"\nassistant: "Let me use the fastapi-backend-developer agent to review your endpoint implementation."\n<commentary>\nThe user has FastAPI code that needs review, so use the fastapi-backend-developer agent to analyze it against FastAPI best practices and suggest improvements.\n</commentary>\n</example>\n\n<example>\nContext: The user needs help with FastAPI-specific patterns.\nuser: "How should I structure my authentication dependencies in FastAPI?"\nassistant: "I'll use the fastapi-backend-developer agent to show you the proper authentication dependency pattern."\n<commentary>\nThe user is asking about FastAPI-specific patterns, so use the fastapi-backend-developer agent to provide expert guidance on dependency injection for authentication.\n</commentary>\n</example>
model: opus
color: green
---

# FastAPI Best Practices

## Project Structure

Domain-driven structure inspired by Netflix's Dispatch:

```
fastapi-project
├── alembic/
├── src
│   ├── auth
│   │   ├── router.py          # endpoints
│   │   ├── schemas.py         # pydantic models
│   │   ├── models.py          # sqlmodel tables
│   │   ├── dependencies.py    # router dependencies
│   │   ├── config.py          # local configs
│   │   ├── constants.py
│   │   ├── exceptions.py
│   │   ├── service.py         # business logic
│   │   └── utils.py           # non-business logic
│   ├── aws
│   │   ├── client.py          # external service client
│   │   ├── schemas.py
│   │   ├── config.py
│   │   ├── constants.py
│   │   ├── exceptions.py
│   │   └── utils.py
│   └── posts
│       ├── router.py
│       ├── schemas.py
│       ├── models.py
│       ├── dependencies.py
│       ├── constants.py
│       ├── exceptions.py
│       ├── service.py
│       └── utils.py
│   ├── config.py              # global configs
│   ├── models.py              # global models
│   ├── exceptions.py          # global exceptions
│   ├── pagination.py          # global modules
│   ├── database.py            # db connection
│   └── main.py                # FastAPI app root
├── tests/
│   ├── auth
│   ├── aws
│   └── posts
├── templates/
├── pyproject.toml             # uv package management
├── uv.lock                    # lock file
├── .python-version           # Python version for uv
├── .env
├── .gitignore
├── logging.ini
└── alembic.ini
```

**Key Principles:**

- Store all domain directories inside `src/`
- Each package has its own router, schemas, models, service, etc.
- Import from other packages with explicit module names:

```python
from src.auth import constants as auth_constants
from src.notifications import service as notification_service
from src.posts.constants import ErrorCode as PostsErrorCode
```

## Tech Stack

**Core Technologies:**

- **UV** for fast package management
- **Pydantic** for data validation and serialization
- **SQLModel** for ORM and type-safe models
- **Async PostgreSQL** driver (asyncpg)
- **Redis** for caching/sessions
- **JWT** for authentication
- **Bcrypt/Argon2** for password hashing
- **Alembic** for database migrations
- **Ruff** for linting/formatting
- **Pytest** with async support for testing

## Async Routes

### I/O Intensive Tasks

FastAPI handles async and sync routes differently:

```python
@router.get("/terrible-ping")
async def terrible_ping():
    time.sleep(10)  # ❌ Blocks entire event loop
    return {"pong": True}

@router.get("/good-ping")
def good_ping():
    time.sleep(10)  # ✅ Runs in threadpool, doesn't block event loop
    return {"pong": True}

@router.get("/perfect-ping")
async def perfect_ping():
    await asyncio.sleep(10)  # ✅ Non-blocking I/O
    return {"pong": True}
```

**What happens:**

- `/terrible-ping`: Blocks entire server, no new requests accepted
- `/good-ping`: Runs in thread pool, main thread continues
- `/perfect-ping`: Event loop continues with other tasks

**Thread pool limitations:**

- Limited number of threads
- More resource-intensive than coroutines
- Can become bottleneck

### CPU Intensive Tasks

- CPU tasks in async functions are worthless (CPU must work to finish)
- Thread pool also ineffective due to GIL
- Send CPU-intensive tasks to separate processes

## Pydantic & SQLModel

### Pydantic Models

```python
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

class MusicBand(str, Enum):
   AEROSMITH = "AEROSMITH"
   QUEEN = "QUEEN"
   ACDC = "AC/DC"

class UserBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=128)
    username: str = Field(pattern="^[A-Za-z0-9-_]+$")
    email: EmailStr
    age: int = Field(ge=18, default=None)
    favorite_band: MusicBand | None = None

    @field_validator("username", mode="after")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError("Username too short")
        return v

    @model_validator(mode="after")
    def validate_model(self):
        # Cross-field validation
        return self
```

### SQLModel Integration

```python
from datetime import datetime
from sqlmodel import Field, SQLModel, Session, select
from sqlalchemy.ext.asyncio import AsyncSession

# SQLModel combines Pydantic + SQLAlchemy
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True)
    username: str = Field(min_length=3, max_length=50)
    is_active: bool = Field(default=True)

class User(UserBase, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserResponse(UserBase):
    id: int
    created_at: datetime
```

### Custom Base Model

```python
from datetime import datetime
from zoneinfo import ZoneInfo
from pydantic import BaseModel, ConfigDict, field_serializer

class CustomModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
        use_enum_values=True,
        json_schema_extra={"example": "value"},
    )

    @field_serializer("*", mode="wrap")
    def serialize_datetime(self, value, handler, info):
        if isinstance(value, datetime):
            if not value.tzinfo:
                value = value.replace(tzinfo=ZoneInfo("UTC"))
            return value.isoformat()
        return handler(value)
```

### Decouple BaseSettings

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class AuthConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AUTH_")

    jwt_algorithm: str = Field(default="HS256")
    jwt_secret: str
    jwt_expiration: int = Field(default=30)  # minutes
    refresh_token_expiration: int = Field(default=7)  # days

class DatabaseConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DB_")

    url: str = Field(alias="DATABASE_URL")
    pool_size: int = Field(default=10)
    max_overflow: int = Field(default=20)

auth_settings = AuthConfig()
db_settings = DatabaseConfig()
```

## Dependencies

### Beyond Dependency Injection

Use dependencies for request validation against database:

```python
from typing import Annotated
from fastapi import Depends
from sqlmodel import select

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

DbSession = Annotated[AsyncSession, Depends(get_session)]

async def valid_post_id(
    post_id: int,
    session: DbSession
) -> Post:
    result = await session.exec(select(Post).where(Post.id == post_id))
    post = result.first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post_by_id(post: Post = Depends(valid_post_id)):
    return post
```

### Chain Dependencies

```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: DbSession = None
) -> User:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await session.exec(select(User).where(User.id == payload["sub"]))
    user = result.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
    return user

async def valid_owned_post(
    post: Post = Depends(valid_post_id),
    user: User = Depends(get_current_active_user)
) -> Post:
    if post.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not owner")
    return post
```

### Decouple & Reuse Dependencies

Dependencies are cached within request scope:

```python
CurrentUser = Annotated[User, Depends(get_current_active_user)]

@router.get("/users/me/posts/{post_id}")
async def get_user_post(
    post: Post = Depends(valid_owned_post),  # Calls get_current_user
    user: CurrentUser = None,  # Cached, not called again
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    background_tasks.add_task(log_access, user.id, post.id)
    return post
```

### Prefer Async Dependencies

Sync dependencies run in thread pool with associated costs. Use async when possible.

## Database with SQLModel

### Database Setup

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
)

async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
```

### SQL-first, Pydantic-second

Use ORM style for simple CRUD operations, Core DSL for complex queries, and raw SQL only when absolutely necessary.

```python
from sqlmodel import select, func, text, and_, or_, desc

# Simple CRUD with ORM style - clean and readable
async def get_user(session: AsyncSession, user_id: int) -> User:
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user

async def create_post(session: AsyncSession, post: PostCreate, user_id: int) -> Post:
    db_post = Post(**post.model_dump(), creator_id=user_id)
    session.add(db_post)
    await session.commit()
    await session.refresh(db_post)
    return db_post

# Use Core DSL for complex queries with joins and aggregations
async def get_posts_with_stats(session: AsyncSession, creator_id: int) -> list[dict]:
    stmt = (
        select(
            Post.id,
            Post.title,
            User.username.label('author'),
            func.count(PostLike.user_id).label('likes')
        )
        .join(User, Post.creator_id == User.id)
        .outerjoin(PostLike, Post.id == PostLike.post_id)
        .where(Post.creator_id == creator_id)
        .group_by(Post.id, User.username)
        .order_by(desc(Post.created_at))
        .limit(10)
    )
    result = await session.exec(stmt)
    return [row._asdict() for row in result.all()]

# Dynamic query building
async def search_posts(session: AsyncSession, filters: dict) -> list[dict]:
    stmt = select(Post.id, Post.title)
    conditions = []

    if search := filters.get('search'):
        conditions.append(Post.title.ilike(f'%{search}%'))
    if author_id := filters.get('author_id'):
        conditions.append(Post.creator_id == author_id)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    result = await session.exec(stmt)
    return [row._asdict() for row in result.all()]

# Raw SQL only when absolutely necessary (recursive CTEs, DB-specific features)
async def get_comment_thread(session: AsyncSession, comment_id: int) -> list[dict]:
    query = text("""
        WITH RECURSIVE thread AS (
            SELECT id, parent_id, 0 as depth FROM comments WHERE id = :id
            UNION ALL
            SELECT c.id, c.parent_id, t.depth + 1
            FROM comments c JOIN thread t ON c.parent_id = t.id
            WHERE t.depth < 10
        )
        SELECT * FROM thread ORDER BY depth
    """)
    result = await session.execute(query, {"id": comment_id})
    return result.mappings().all()
```

### Naming Conventions

```python
from sqlalchemy import MetaData

POSTGRES_INDEXES_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}

# Apply to SQLModel
SQLModel.metadata.naming_convention = POSTGRES_INDEXES_NAMING_CONVENTION
```

### Migrations with Alembic

```ini
# alembic.ini
file_template = %%(year)d-%%(month).2d-%%(day).2d_%%(slug)s
```

```python
# alembic/env.py
from sqlmodel import SQLModel
from src.models import *  # Import all models

target_metadata = SQLModel.metadata
```

### Table Naming Rules

- `lower_case_snake`
- Singular form (e.g. `post`, `post_like`, `user_playlist`)
- Group with module prefix (e.g. `payment_account`, `payment_bill`)
- Stay consistent but use concrete names when needed
- `_at` suffix for datetime
- `_date` suffix for date

## Miscellaneous

### Follow REST

Reuse dependencies with consistent naming:

```python
async def valid_profile_id(
    profile_id: int,
    session: DbSession
) -> Profile:
    result = await session.exec(
        select(Profile).where(Profile.id == profile_id)
    )
    profile = result.first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile

async def valid_creator_id(
    profile: Profile = Depends(valid_profile_id)
) -> Profile:
    if not profile.is_creator:
        raise HTTPException(403, "Not a creator")
    return profile

# Use same variable name for chaining
@router.get("/profiles/{profile_id}")
async def get_profile(profile: Profile = Depends(valid_profile_id)):
    return profile

@router.get("/creators/{profile_id}")  # Same param name
async def get_creator(creator: Profile = Depends(valid_creator_id)):
    return creator
```

### Response Serialization

FastAPI creates Pydantic models twice, optimize when needed:

```python
# Return dict for simple responses
@router.get("/posts", response_model=list[PostResponse])
async def get_posts(session: DbSession):
    result = await session.exec(select(Post))
    return [post.model_dump() for post in result.all()]
```

### Sync SDK in Thread Pool

```python
from fastapi.concurrency import run_in_threadpool

@router.post("/send-email")
async def send_email(email_data: EmailSchema):
    # If using sync email client
    await run_in_threadpool(sync_email_client.send, email_data.model_dump())
```

### ValueErrors Become ValidationErrors

```python
class ProfileCreate(BaseModel):
    username: str

    @field_validator("password", mode="after")
    @classmethod
    def valid_password(cls, password: str) -> str:
        if not re.match(STRONG_PASSWORD_PATTERN, password):
            raise ValueError(
                "Password must contain at least "
                "one lower character, "
                "one upper character, "
                "digit or special symbol"
            )
        return password
```

### Docs Configuration

```python
from fastapi import FastAPI
import os

app = FastAPI(
    title="My API",
    openapi_url="/openapi.json" if os.getenv("ENVIRONMENT") in ["local", "staging"] else None,
)

@router.post(
    "/posts",
    response_model=PostResponse,
    status_code=201,
    tags=["Posts"],
    summary="Create a new post",
    responses={
        201: {"description": "Post created successfully"},
        400: {"description": "Invalid input"},
    }
)
async def create_post(post: PostCreate, session: DbSession):
    pass
```

## Testing

### Async Test Client

```python
import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel import SQLModel

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

@pytest.fixture
async def session():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        async with async_session() as session:
            yield session
        await conn.run_sync(SQLModel.metadata.drop_all)

@pytest.mark.asyncio
async def test_create_post(client: AsyncClient, session: AsyncSession):
    response = await client.post(
        "/posts",
        json={"title": "Test", "content": "Content"}
    )
    assert response.status_code == 201
```

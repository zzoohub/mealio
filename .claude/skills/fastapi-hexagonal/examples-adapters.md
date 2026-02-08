# Examples: Adapters

Inbound (Shell, handlers, auth, errors) and outbound (DB, ORM mapper, eager loading).

---

## Outbound: ORM Model + Mapper

```python
# src/outbound/postgres/models.py
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class AuthorModel(Base):
    """SQLAlchemy ORM model — outbound only. Never import in domain."""
    __tablename__ = "authors"
    id: Mapped[str] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)


# src/outbound/postgres/mapper.py
from uuid import UUID
from domain.authors.models import Author, AuthorName
from outbound.postgres.models import AuthorModel


class AuthorMapper:
    """ORM ↔ domain translation. Keeps domain free from SQLAlchemy."""

    @staticmethod
    def to_domain(row: AuthorModel) -> Author:
        return Author(
            id=row.id if isinstance(row.id, UUID) else UUID(str(row.id)),
            name=AuthorName(row.name),
        )

    @staticmethod
    def to_orm(author: Author) -> dict:
        return {"id": author.id, "name": author.name.value}
```

## Outbound: Postgres Adapter (ORM + mapper)

```python
# src/outbound/postgres/repository.py
import uuid
import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

from domain.authors.errors import DuplicateAuthorError, UnknownAuthorError
from domain.authors.models import Author, CreateAuthorRequest
from outbound.postgres.mapper import AuthorMapper
from outbound.postgres.models import AuthorModel

logger = logging.getLogger(__name__)


class PostgresAuthorRepository:
    """Transactions encapsulated here — invisible to callers."""

    def __init__(self, database_url: str) -> None:
        self._engine = create_async_engine(
            database_url,
            pool_size=10,
            pool_timeout=3,
            pool_pre_ping=True,
        )
        self._session_factory = async_sessionmaker(
            self._engine, expire_on_commit=False,
        )

    async def create_author(self, req: CreateAuthorRequest) -> Author:
        author_id = uuid.uuid4()
        async with self._session_factory() as session:
            async with session.begin():
                try:
                    model = AuthorModel(id=author_id, name=req.name.value)
                    session.add(model)
                    await session.flush()
                except IntegrityError:
                    raise DuplicateAuthorError(name=req.name)
                except Exception as exc:
                    raise UnknownAuthorError(exc) from exc
        return Author(id=author_id, name=req.name)

    async def find_author(self, author_id: uuid.UUID) -> Author | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(AuthorModel).where(AuthorModel.id == author_id)
            )
            row = result.scalar_one_or_none()
            if row is None:
                return None
            return AuthorMapper.to_domain(row)
```

## Outbound: SQLite Adapter (raw SQL, no ORM)

```python
# src/outbound/sqlite/repository.py
import uuid
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from domain.authors.errors import DuplicateAuthorError, UnknownAuthorError
from domain.authors.models import Author, AuthorName, CreateAuthorRequest


class SqliteAuthorRepository:
    """Raw SQL — demonstrates adapters choose their own strategy."""

    def __init__(self, database_url: str) -> None:
        self._engine = create_async_engine(database_url, pool_timeout=3)
        self._session_factory = async_sessionmaker(
            self._engine, expire_on_commit=False,
        )

    @classmethod
    def from_engine(cls, engine) -> "SqliteAuthorRepository":
        """Construct from existing engine (for testing)."""
        instance = object.__new__(cls)
        instance._engine = engine
        instance._session_factory = async_sessionmaker(engine, expire_on_commit=False)
        return instance

    async def create_author(self, req: CreateAuthorRequest) -> Author:
        author_id = uuid.uuid4()
        async with self._session_factory() as session:
            async with session.begin():
                try:
                    await session.execute(
                        text("INSERT INTO authors (id, name) VALUES (:id, :name)"),
                        {"id": str(author_id), "name": req.name.value},
                    )
                except IntegrityError:
                    raise DuplicateAuthorError(name=req.name)
                except Exception as exc:
                    raise UnknownAuthorError(exc) from exc
        return Author(id=author_id, name=req.name)

    async def find_author(self, author_id: uuid.UUID) -> Author | None:
        async with self._session_factory() as session:
            result = await session.execute(
                text("SELECT id, name FROM authors WHERE id = :id"),
                {"id": str(author_id)},
            )
            row = result.fetchone()
            if row is None:
                return None
            return Author(id=uuid.UUID(row[0]), name=AuthorName(row[1]))
```

## Outbound: Eager Loading (N+1 Prevention)

```python
# Additional method on PostgresAuthorRepository
async def find_author_with_posts(self, author_id: uuid.UUID) -> Author | None:
    async with self._session_factory() as session:
        result = await session.execute(
            select(AuthorModel)
            .options(selectinload(AuthorModel.posts))  # ✅ eager load
            .where(AuthorModel.id == author_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        return AuthorMapper.to_domain_with_posts(row)
```

---

## Inbound: Shell (wraps FastAPI + uvicorn)

```python
# src/inbound/http/shell.py
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from domain.authors.ports import AuthorService
from inbound.http.authors.router import author_routes
from inbound.http.errors import register_exception_handlers


class Shell:
    """HTTP interface. Wraps FastAPI so main.py never imports it."""

    def __init__(self, config, author_service: AuthorService) -> None:
        self.config = config
        self.app = self._build_app(author_service, config)

    async def run(self) -> None:
        server_config = uvicorn.Config(
            self.app, host="0.0.0.0", port=self.config.port, log_level="info",
        )
        server = uvicorn.Server(server_config)
        await server.serve()

    @staticmethod
    def _build_app(author_service: AuthorService, config) -> FastAPI:
        @asynccontextmanager
        async def lifespan(app: FastAPI):
            yield {"author_service": author_service}

        app = FastAPI(lifespan=lifespan)
        app.add_middleware(
            CORSMiddleware,
            allow_origins=config.cors_origins,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        app.include_router(author_routes(), prefix="/authors")
        register_exception_handlers(app)
        return app

    @staticmethod
    def build_test_app(author_service: AuthorService, config) -> FastAPI:
        """For tests: returns ASGI app without uvicorn."""
        return Shell._build_app(author_service, config)
```

## Inbound: Dependency Injection

```python
# src/inbound/http/dependencies.py
from fastapi import Request
from domain.authors.ports import AuthorService


def with_author_service(request: Request) -> AuthorService:
    """ASGI lifespan state — framework-agnostic."""
    return request.state.author_service
```

## Inbound: Auth Dependency

```python
# src/inbound/http/auth.py
"""Auth lives entirely in the inbound layer. Domain never handles tokens."""
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import AppConfig

_settings = AppConfig()
_pwd_context = CryptContext(schemes=["bcrypt"])
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)

def create_access_token(user_id: int, expires_minutes: int = 30) -> str:
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expire}, _settings.secret_key, algorithm="HS256")

def _decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, _settings.secret_key, algorithms=["HS256"])
        return int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        return None

async def get_current_user(token: str = Depends(_oauth2_scheme)) -> int:
    user_id = _decode_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id

async def get_current_user_optional(
    token: str | None = Depends(OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)),
) -> int | None:
    if token is None:
        return None
    return _decode_token(token)
```

## Inbound: Request / Response Schemas

```python
# src/inbound/http/authors/request.py
from pydantic import BaseModel
from domain.authors.models import AuthorName, CreateAuthorRequest


class CreateAuthorHttpRequestBody(BaseModel):
    """HTTP request body — decoupled from domain."""
    name: str

    def try_into_domain(self) -> CreateAuthorRequest:
        return CreateAuthorRequest(name=AuthorName(self.name))


# src/inbound/http/authors/response.py
from pydantic import BaseModel
from domain.authors.models import Author


class AuthorResponseData(BaseModel):
    """Public API representation — never expose domain models directly."""
    id: str
    name: str

    @classmethod
    def from_domain(cls, author: Author) -> "AuthorResponseData":
        return cls(id=str(author.id), name=author.name.value)
```

## Inbound: Handler (Router)

```python
# src/inbound/http/authors/router.py
from fastapi import APIRouter, Depends
from domain.authors.ports import AuthorService
from inbound.http.authors.request import CreateAuthorHttpRequestBody
from inbound.http.authors.response import AuthorResponseData
from inbound.http.dependencies import with_author_service
from inbound.http.response import Created


def author_routes() -> APIRouter:
    router = APIRouter()

    @router.post("", status_code=201)
    async def create_author(
        body: CreateAuthorHttpRequestBody,
        service: AuthorService = Depends(with_author_service),
    ) -> Created[AuthorResponseData]:
        domain_req = body.try_into_domain()
        author = await service.create_author(domain_req)
        return Created(data=AuthorResponseData.from_domain(author))

    return router
```

## Inbound: API Error (RFC 9457)

```python
# src/inbound/http/errors.py
import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from domain.authors.errors import AuthorNameEmptyError, DuplicateAuthorError, UnknownAuthorError

logger = logging.getLogger(__name__)


def _problem(type_slug: str, title: str, status: int, detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "type": f"https://api.example.com/errors/{type_slug}",
            "title": title, "status": status, "detail": detail,
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DuplicateAuthorError)
    async def handle_duplicate(request: Request, exc: DuplicateAuthorError):
        return _problem("duplicate-author", "Unprocessable Entity", 422,
                        f"author with name {exc.name.value} already exists")

    @app.exception_handler(AuthorNameEmptyError)
    async def handle_empty_name(request: Request, exc: AuthorNameEmptyError):
        return _problem("validation-error", "Unprocessable Entity", 422,
                        "author name cannot be empty")

    @app.exception_handler(UnknownAuthorError)
    async def handle_unknown(request: Request, exc: UnknownAuthorError):
        logger.error("Unexpected error: %s", exc.cause, exc_info=exc.cause)
        return _problem("internal-error", "Internal Server Error", 500,
                        "An unexpected error occurred")

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError):
        return _problem("validation-error", "Validation Failed", 422,
                        "One or more fields failed validation")

    @app.exception_handler(Exception)
    async def handle_generic(request: Request, exc: Exception):
        logger.error("Unhandled exception: %s", exc, exc_info=exc)
        return _problem("internal-error", "Internal Server Error", 500,
                        "An unexpected error occurred")
```

## Inbound: Response Wrappers

```python
# src/inbound/http/response.py
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class ApiSuccess(BaseModel, Generic[T]):
    data: T

class Created(ApiSuccess[T], Generic[T]):
    pass

class Ok(ApiSuccess[T], Generic[T]):
    pass

class NoContent(BaseModel):
    pass
```

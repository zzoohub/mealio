# FastAPI Examples

JWT authentication and testing patterns.

---

## JWT Authentication

### Service Layer

```python
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"])
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: int, expires_delta: timedelta | None = None) -> str:
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub"))
    except JWTError:
        return None
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
    user_id = decode_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Optional: for routes that work with or without auth
async def get_current_user_optional(
    token: str | None = Depends(OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)),
    db: AsyncSession = Depends(get_db)
) -> User | None:
    if token is None:
        return None
    return await get_current_user(token, db)
```

### Login Router

```python
from fastapi.security import OAuth2PasswordRequestForm

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer"
    }
```

### Protected Route

```python
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/items", response_model=ItemResponse, status_code=201)
async def create_item(
    item_in: ItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    item = Item(**item_in.model_dump(), owner_id=current_user.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item
```

---

## Testing

### Setup with pytest + httpx

```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.main import app
from app.database import get_db, Base

# Test database
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"
test_engine = create_async_engine(TEST_DATABASE_URL)
TestSession = async_sessionmaker(test_engine, expire_on_commit=False)

@pytest.fixture
async def db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSession() as session:
        yield session
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(db):
    async def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    
    app.dependency_overrides.clear()
```

### Test Examples

```python
import pytest

@pytest.mark.asyncio
async def test_create_item(client, db):
    # Create user and get token first
    response = await client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 201
    
    login_response = await client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "password123"
    })
    token = login_response.json()["access_token"]
    
    # Create item with auth
    response = await client.post(
        "/items",
        json={"name": "Test Item", "price": 9.99},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    assert response.json()["data"]["name"] == "Test Item"

@pytest.mark.asyncio
async def test_unauthorized_access(client):
    response = await client.get("/users/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_validation_error(client):
    response = await client.post("/items", json={
        "name": "",  # Invalid: empty
        "price": -10  # Invalid: negative
    })
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert len(errors) >= 2
```

### Testing with Authenticated User Fixture

```python
@pytest.fixture
async def auth_headers(client, db):
    """Fixture that returns headers with valid auth token"""
    await client.post("/auth/register", json={
        "email": "fixture@example.com",
        "password": "password123"
    })
    response = await client.post("/auth/login", data={
        "username": "fixture@example.com",
        "password": "password123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_protected_route(client, auth_headers):
    response = await client.get("/users/me", headers=auth_headers)
    assert response.status_code == 200
```

---

## Configuration with pydantic-settings

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./db.sqlite"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

settings = Settings()
```

---

## Error Handler Pattern

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "type": "https://api.example.com/errors/validation-failed",
            "title": "Validation Failed",
            "status": 422,
            "detail": "One or more fields failed validation",
            "errors": [
                {
                    "field": ".".join(str(loc) for loc in err["loc"]),
                    "message": err["msg"],
                    "type": err["type"]
                }
                for err in exc.errors()
            ]
        }
    )

# Generic exception handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "type": "https://api.example.com/errors/internal",
            "title": "Internal Server Error",
            "status": 500,
            "detail": "An unexpected error occurred"
        }
    )
```

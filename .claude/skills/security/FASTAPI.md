# FastAPI Security Patterns

Python/FastAPI specific security implementations.

## Input Validation (Pydantic)

```python
from pydantic import BaseModel, EmailStr, Field, validator

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)
    
    @validator("password")
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Must contain uppercase")
        if not any(c.isdigit() for c in v):
            raise ValueError("Must contain digit")
        return v
```

## JWT Authentication

```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()
SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=15)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET, algorithm=ALGORITHM)

async def get_current_user(cred = Depends(security)):
    try:
        payload = jwt.decode(cred.credentials, SECRET, algorithms=[ALGORITHM])
        return await get_user(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

## SQL Injection Prevention

```python
# ❌ Bad
query = f"SELECT * FROM users WHERE id = '{user_id}'"

# ✅ Good - SQLAlchemy ORM
user = db.query(User).filter(User.id == user_id).first()

# ✅ Good - parameterized
from sqlalchemy import text
query = text("SELECT * FROM users WHERE id = :id")
result = await db.execute(query, {"id": user_id})
```

## Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, cred: LoginRequest):
    pass
```

## CORS

```python
from fastapi.middleware.cors import CORSMiddleware

origins = ["https://myapp.com"]
if os.getenv("ENV") == "development":
    origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

## Environment Validation

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    env: str = "development"
    
    class Config:
        env_file = ".env"

settings = Settings()  # Validates at startup
```

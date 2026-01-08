"""Authentication dependencies."""

from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.auth.service import AuthService
from src.database import get_session
from src.exceptions import UnauthorizedError

# Security scheme
security = HTTPBearer()

# Service instance
auth_service = AuthService()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    user = await auth_service.get_user_by_token(session, token)
    
    if not user:
        raise UnauthorizedError("Invalid authentication credentials")
    
    if not user.is_active:
        raise UnauthorizedError("User account is inactive")
    
    return user


async def get_current_verified_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Get current authenticated and verified user."""
    if not user.is_verified:
        raise UnauthorizedError("Phone number not verified")
    return user


async def get_optional_user(
    authorization: Annotated[str | None, Header()] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
) -> User | None:
    """Get optional authenticated user from JWT token."""
    if not authorization:
        return None
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        
        user = await auth_service.get_user_by_token(session, token)
        return user if user and user.is_active else None
    except Exception:
        return None


# Type aliases for cleaner code
CurrentUser = Annotated[User, Depends(get_current_user)]
VerifiedUser = Annotated[User, Depends(get_current_verified_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
DbSession = Annotated[AsyncSession, Depends(get_session)]
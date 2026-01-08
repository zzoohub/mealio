"""Authentication router."""

from fastapi import APIRouter, BackgroundTasks, Request, status

from src.auth.dependencies import CurrentUser, DbSession, VerifiedUser
from src.auth.schemas import (
    PhoneLoginRequest,
    PhoneVerifyRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserCreateRequest,
    UserResponse,
    VerificationStatusResponse,
)
from src.auth.service import AuthService
from src.exceptions import BadRequestError

router = APIRouter(prefix="/auth", tags=["Authentication"])
auth_service = AuthService()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
)
async def register(
    user_data: UserCreateRequest,
    session: DbSession,
) -> UserResponse:
    """Register a new user account."""
    user = await auth_service.register_user(session, user_data)
    return UserResponse(
        id=user.id,
        username=user.username,
        phone=user.phone,
        email=user.email,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login_at=user.last_login_at,
    )


@router.post(
    "/phone/send-code",
    response_model=VerificationStatusResponse,
    summary="Send verification code",
)
async def send_verification_code(
    request: PhoneLoginRequest,
    session: DbSession,
    background_tasks: BackgroundTasks,
) -> VerificationStatusResponse:
    """Send verification code to phone number."""
    verification = await auth_service.send_verification_code(session, request.phone)
    
    # In production, send SMS in background
    # background_tasks.add_task(send_sms, request.phone, verification.verification_code)
    
    return VerificationStatusResponse(
        phone=request.phone,
        is_sent=True,
        expires_in=300,  # 5 minutes
        attempts_remaining=3 - verification.attempts,
        message="Verification code sent successfully",
    )


@router.post(
    "/phone/verify",
    response_model=TokenResponse,
    summary="Verify phone and login",
)
async def verify_phone(
    request: PhoneVerifyRequest,
    session: DbSession,
    client_request: Request,
) -> TokenResponse:
    """Verify phone number and create session."""
    # Verify the code
    is_verified = await auth_service.verify_phone(session, request.phone, request.code)
    
    if not is_verified:
        raise BadRequestError("Invalid verification code")
    
    # Authenticate user (create if doesn't exist)
    user = await auth_service.authenticate_user(session, request.phone)
    
    if not user:
        # Auto-create user with phone number
        from src.auth.schemas import UserCreateRequest
        
        # Generate username from phone
        username = f"user_{request.phone[-6:]}"
        user_data = UserCreateRequest(
            username=username,
            phone=request.phone,
            email=None,
        )
        user = await auth_service.register_user(session, user_data)
        user.is_verified = True
        await session.commit()
    else:
        # Mark user as verified
        user.is_verified = True
        await session.commit()
    
    # Get device info from request
    device_info = {
        "user_agent": client_request.headers.get("User-Agent"),
        "platform": client_request.headers.get("X-Platform"),
        "app_version": client_request.headers.get("X-App-Version"),
    }
    
    # Create session and return tokens
    return await auth_service.create_user_session(
        session,
        user,
        device_info=device_info,
        ip_address=client_request.client.host,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
async def refresh_token(
    request: RefreshTokenRequest,
    session: DbSession,
) -> TokenResponse:
    """Refresh access token using refresh token."""
    return await auth_service.refresh_access_token(session, request.refresh_token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout user",
)
async def logout(
    user: CurrentUser,
    session: DbSession,
) -> None:
    """Logout current user by invalidating all sessions."""
    await auth_service.logout(session, str(user.id))


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
)
async def get_current_user_info(
    user: VerifiedUser,
) -> UserResponse:
    """Get current authenticated user information."""
    return UserResponse(
        id=user.id,
        username=user.username,
        phone=user.phone,
        email=user.email,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login_at=user.last_login_at,
    )


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user",
)
async def update_current_user(
    user: VerifiedUser,
    session: DbSession,
    username: str | None = None,
    email: str | None = None,
    avatar_url: str | None = None,
) -> UserResponse:
    """Update current user information."""
    if username:
        user.username = username.lower()
    if email is not None:
        user.email = email
    if avatar_url is not None:
        user.avatar_url = avatar_url
    
    await session.commit()
    await session.refresh(user)
    
    return UserResponse(
        id=user.id,
        username=user.username,
        phone=user.phone,
        email=user.email,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login_at=user.last_login_at,
    )


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete current user",
)
async def delete_current_user(
    user: VerifiedUser,
    session: DbSession,
) -> None:
    """Soft delete current user account."""
    from datetime import datetime, timezone
    
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    await session.commit()
    
    # Invalidate all sessions
    await auth_service.logout(session, str(user.id))
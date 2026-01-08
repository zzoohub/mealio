"""Authentication service layer."""

import hashlib
import random
import string
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import PhoneVerification, User, UserSession
from src.auth.schemas import TokenResponse, UserCreateRequest
from src.config import settings
from src.exceptions import BadRequestError, ConflictError, UnauthorizedError

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Authentication service."""

    @staticmethod
    def generate_verification_code() -> str:
        """Generate 6-digit verification code."""
        return "".join(random.choices(string.digits, k=6))

    @staticmethod
    def hash_token(token: str) -> str:
        """Hash a token using SHA-256."""
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def create_access_token(
        data: dict,
        expires_delta: timedelta | None = None,
    ) -> str:
        """Create JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=settings.jwt_access_token_expire_minutes
            )
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    @staticmethod
    def create_refresh_token(
        data: dict,
        expires_delta: timedelta | None = None,
    ) -> str:
        """Create JWT refresh token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                days=settings.jwt_refresh_token_expire_days
            )
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode and validate JWT token."""
        try:
            payload = jwt.decode(
                token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
            )
            return payload
        except JWTError:
            raise UnauthorizedError("Invalid token")

    async def send_verification_code(
        self,
        session: AsyncSession,
        phone: str,
    ) -> PhoneVerification:
        """Send verification code to phone number."""
        # Check if there's a recent verification
        result = await session.exec(
            select(PhoneVerification)
            .where(PhoneVerification.phone == phone)
            .where(PhoneVerification.expires_at > datetime.now(timezone.utc))
            .where(PhoneVerification.is_verified == False)
            .order_by(PhoneVerification.created_at.desc())
        )
        recent_verification = result.first()

        if recent_verification and recent_verification.attempts >= settings.sms_verification_max_attempts:
            raise BadRequestError("Too many verification attempts. Please try again later.")

        # Generate new verification code
        code = self.generate_verification_code()
        expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=settings.sms_verification_timeout_seconds
        )

        # Create verification record
        verification = PhoneVerification(
            phone=phone,
            verification_code=code,
            expires_at=expires_at,
        )
        session.add(verification)
        await session.commit()

        # In production, send SMS via Twilio
        if settings.sms_verification_enabled and settings.twilio_verify_service_sid:
            # TODO: Implement Twilio SMS sending
            pass
        else:
            # For development, log the code
            print(f"Verification code for {phone}: {code}")

        return verification

    async def verify_phone(
        self,
        session: AsyncSession,
        phone: str,
        code: str,
    ) -> bool:
        """Verify phone number with code."""
        # Get the most recent verification for this phone
        result = await session.exec(
            select(PhoneVerification)
            .where(PhoneVerification.phone == phone)
            .where(PhoneVerification.is_verified == False)
            .where(PhoneVerification.expires_at > datetime.now(timezone.utc))
            .order_by(PhoneVerification.created_at.desc())
        )
        verification = result.first()

        if not verification:
            raise BadRequestError("No valid verification code found")

        # Increment attempts
        verification.attempts += 1

        if verification.attempts > settings.sms_verification_max_attempts:
            await session.commit()
            raise BadRequestError("Too many verification attempts")

        if verification.verification_code != code:
            await session.commit()
            raise BadRequestError("Invalid verification code")

        # Mark as verified
        verification.is_verified = True
        verification.verified_at = datetime.now(timezone.utc)
        await session.commit()

        return True

    async def register_user(
        self,
        session: AsyncSession,
        user_data: UserCreateRequest,
    ) -> User:
        """Register a new user."""
        # Check if username exists
        result = await session.exec(
            select(User).where(User.username == user_data.username)
        )
        if result.first():
            raise ConflictError("Username already exists")

        # Check if phone exists
        result = await session.exec(select(User).where(User.phone == user_data.phone))
        if result.first():
            raise ConflictError("Phone number already registered")

        # Check if email exists (if provided)
        if user_data.email:
            result = await session.exec(select(User).where(User.email == user_data.email))
            if result.first():
                raise ConflictError("Email already registered")

        # Create user
        user = User(
            username=user_data.username.lower(),
            phone=user_data.phone,
            email=user_data.email,
            is_verified=False,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        return user

    async def authenticate_user(
        self,
        session: AsyncSession,
        phone: str,
    ) -> User | None:
        """Authenticate user by phone."""
        result = await session.exec(
            select(User)
            .where(User.phone == phone)
            .where(User.is_active == True)
            .where(User.deleted_at.is_(None))
        )
        user = result.first()

        if user:
            # Update last login
            user.last_login_at = datetime.now(timezone.utc)
            await session.commit()

        return user

    async def create_user_session(
        self,
        session: AsyncSession,
        user: User,
        device_info: dict | None = None,
        ip_address: str | None = None,
    ) -> TokenResponse:
        """Create user session and return tokens."""
        # Create tokens
        access_token = self.create_access_token(
            data={"sub": str(user.id), "username": user.username}
        )
        refresh_token = self.create_refresh_token(
            data={"sub": str(user.id)}
        )

        # Create session record
        user_session = UserSession(
            user_id=user.id,
            token_hash=self.hash_token(refresh_token),
            device_info=device_info,
            ip_address=ip_address,
            expires_at=datetime.now(timezone.utc) + timedelta(
                days=settings.jwt_refresh_token_expire_days
            ),
        )
        session.add(user_session)
        await session.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
            user_id=user.id,
        )

    async def get_user_by_token(
        self,
        session: AsyncSession,
        token: str,
    ) -> User | None:
        """Get user from JWT token."""
        try:
            payload = self.decode_token(token)
            user_id = payload.get("sub")
            if not user_id:
                return None

            result = await session.exec(
                select(User)
                .where(User.id == user_id)
                .where(User.is_active == True)
                .where(User.deleted_at.is_(None))
            )
            return result.first()
        except Exception:
            return None

    async def refresh_access_token(
        self,
        session: AsyncSession,
        refresh_token: str,
    ) -> TokenResponse:
        """Refresh access token using refresh token."""
        try:
            payload = self.decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise UnauthorizedError("Invalid token type")

            user_id = payload.get("sub")
            if not user_id:
                raise UnauthorizedError("Invalid token")

            # Verify session exists
            token_hash = self.hash_token(refresh_token)
            result = await session.exec(
                select(UserSession)
                .where(UserSession.token_hash == token_hash)
                .where(UserSession.expires_at > datetime.now(timezone.utc))
            )
            user_session = result.first()

            if not user_session:
                raise UnauthorizedError("Session not found or expired")

            # Get user
            result = await session.exec(
                select(User)
                .where(User.id == user_id)
                .where(User.is_active == True)
                .where(User.deleted_at.is_(None))
            )
            user = result.first()

            if not user:
                raise UnauthorizedError("User not found")

            # Update session last used
            user_session.last_used_at = datetime.now(timezone.utc)
            await session.commit()

            # Create new access token
            access_token = self.create_access_token(
                data={"sub": str(user.id), "username": user.username}
            )

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=settings.jwt_access_token_expire_minutes * 60,
                user_id=user.id,
            )

        except JWTError:
            raise UnauthorizedError("Invalid refresh token")

    async def logout(
        self,
        session: AsyncSession,
        user_id: str,
        token: str | None = None,
    ) -> bool:
        """Logout user by invalidating session."""
        if token:
            # Invalidate specific session
            token_hash = self.hash_token(token)
            result = await session.exec(
                select(UserSession)
                .where(UserSession.user_id == user_id)
                .where(UserSession.token_hash == token_hash)
            )
            user_session = result.first()
            if user_session:
                await session.delete(user_session)
                await session.commit()
                return True
        else:
            # Invalidate all sessions for user
            result = await session.exec(
                select(UserSession).where(UserSession.user_id == user_id)
            )
            sessions = result.all()
            for s in sessions:
                await session.delete(s)
            await session.commit()
            return True

        return False
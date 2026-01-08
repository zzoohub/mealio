"""Global configuration for Mealio server."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Environment
    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Application environment",
    )
    debug: bool = Field(default=False)

    # Application
    app_name: str = Field(default="Mealio API")
    app_version: str = Field(default="1.0.0")
    api_prefix: str = Field(default="/api/v1")
    allowed_hosts: list[str] = Field(default=["*"])
    cors_origins: list[str] = Field(default=["*"])

    # Database
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/mealio",
        description="PostgreSQL connection URL",
    )
    db_pool_size: int = Field(default=10)
    db_max_overflow: int = Field(default=20)
    db_pool_timeout: int = Field(default=30)
    db_echo: bool = Field(default=False)

    # Redis
    redis_url: RedisDsn = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL",
    )
    redis_pool_size: int = Field(default=10)
    redis_decode_responses: bool = Field(default=True)

    # JWT Authentication
    jwt_secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT token signing",
    )
    jwt_algorithm: str = Field(default="HS256")
    jwt_access_token_expire_minutes: int = Field(default=30)
    jwt_refresh_token_expire_days: int = Field(default=7)

    # SMS/Phone Verification (Twilio)
    twilio_account_sid: str | None = Field(default=None)
    twilio_auth_token: str | None = Field(default=None)
    twilio_phone_number: str | None = Field(default=None)
    twilio_verify_service_sid: str | None = Field(default=None)
    sms_verification_enabled: bool = Field(default=False)
    sms_verification_timeout_seconds: int = Field(default=300)  # 5 minutes
    sms_verification_max_attempts: int = Field(default=3)

    # AWS S3 (for photo uploads)
    aws_access_key_id: str | None = Field(default=None)
    aws_secret_access_key: str | None = Field(default=None)
    aws_region: str = Field(default="us-east-1")
    s3_bucket_name: str | None = Field(default=None)
    s3_endpoint_url: str | None = Field(default=None)  # For local testing with MinIO
    max_upload_size_mb: int = Field(default=10)

    # AI Service Configuration
    ai_service_url: str | None = Field(default=None)
    ai_service_api_key: str | None = Field(default=None)
    ai_service_timeout_seconds: int = Field(default=30)
    ai_analysis_enabled: bool = Field(default=False)

    # Push Notifications (Firebase/APNs)
    firebase_credentials_path: str | None = Field(default=None)
    apns_key_path: str | None = Field(default=None)
    apns_key_id: str | None = Field(default=None)
    apns_team_id: str | None = Field(default=None)
    push_notifications_enabled: bool = Field(default=False)

    # Rate Limiting
    rate_limit_enabled: bool = Field(default=True)
    rate_limit_requests_per_minute: int = Field(default=60)
    rate_limit_requests_per_hour: int = Field(default=1000)

    # Logging
    log_level: str = Field(default="INFO")
    log_format: str = Field(default="json")
    sentry_dsn: str | None = Field(default=None)

    # Security
    bcrypt_rounds: int = Field(default=12)
    allowed_image_extensions: list[str] = Field(
        default=[".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]
    )
    max_image_dimensions: tuple[int, int] = Field(default=(4096, 4096))

    # Pagination
    default_page_size: int = Field(default=20)
    max_page_size: int = Field(default=100)

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, v: str, info) -> str:
        """Validate JWT secret key is set in production."""
        if info.data.get("environment") == "production" and v == "your-secret-key-change-in-production":
            raise ValueError("JWT secret key must be changed in production")
        return v

    @field_validator("sms_verification_enabled")
    @classmethod
    def validate_sms_config(cls, v: bool, info) -> bool:
        """Validate SMS configuration if enabled."""
        if v and not all([
            info.data.get("twilio_account_sid"),
            info.data.get("twilio_auth_token"),
            info.data.get("twilio_phone_number"),
        ]):
            raise ValueError("Twilio credentials required when SMS verification is enabled")
        return v

    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL for Alembic migrations."""
        return str(self.database_url).replace("+asyncpg", "")


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

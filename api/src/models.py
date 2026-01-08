"""Global SQLModel base models and mixins."""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from pydantic import ConfigDict, field_serializer
from sqlalchemy import MetaData
from sqlmodel import Field, SQLModel

# PostgreSQL naming conventions
POSTGRES_INDEXES_NAMING_CONVENTION = {
    "ix": "%(column_0_label)s_idx",
    "uq": "%(table_name)s_%(column_0_name)s_key",
    "ck": "%(table_name)s_%(constraint_name)s_check",
    "fk": "%(table_name)s_%(column_0_name)s_fkey",
    "pk": "%(table_name)s_pkey",
}

# Apply naming convention to SQLModel metadata
metadata = MetaData(naming_convention=POSTGRES_INDEXES_NAMING_CONVENTION)
SQLModel.metadata = metadata


class UUIDMixin(SQLModel):
    """Mixin for UUID primary key."""

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )


class TimestampMixin(SQLModel):
    """Mixin for created_at and updated_at timestamps."""

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"},
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={
            "server_default": "CURRENT_TIMESTAMP",
            "onupdate": "CURRENT_TIMESTAMP",
        },
    )


class SoftDeleteMixin(SQLModel):
    """Mixin for soft delete support."""

    deleted_at: datetime | None = Field(default=None, nullable=True)

    @property
    def is_deleted(self) -> bool:
        """Check if record is soft deleted."""
        return self.deleted_at is not None


class BaseModel(UUIDMixin, TimestampMixin, SQLModel):
    """Base model with common fields."""

    model_config = ConfigDict(
        validate_assignment=True,
        use_enum_values=True,
        arbitrary_types_allowed=True,
        str_strip_whitespace=True,
    )

    @field_serializer("id", "created_at", "updated_at")
    def serialize_datetime_and_uuid(self, value: Any) -> str | None:
        """Serialize datetime and UUID fields."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, UUID):
            return str(value)
        return value
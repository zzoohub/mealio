"""Social features models."""

from enum import Enum
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

from src.auth.models import User
from src.meals.models import Meal
from src.models import BaseModel, SoftDeleteMixin, TimestampMixin, UUIDMixin


class PostPrivacy(str, Enum):
    """Post privacy enum."""
    
    PUBLIC = "public"
    FRIENDS = "friends"
    PRIVATE = "private"


class Post(BaseModel, SoftDeleteMixin, table=True):
    """Post model."""

    __tablename__ = "posts"

    user_id: UUID = Field(foreign_key="users.id", index=True)
    meal_id: UUID | None = Field(default=None, foreign_key="meals.id", nullable=True, index=True)
    content: str | None = Field(default=None)
    privacy: PostPrivacy = Field(default=PostPrivacy.FRIENDS)
    likes_count: int = Field(default=0, ge=0)
    comments_count: int = Field(default=0, ge=0)
    shares_count: int = Field(default=0, ge=0)
    is_featured: bool = Field(default=False)

    # Relationships
    user: User = Relationship()
    meal: Meal | None = Relationship()
    likes: list["PostLike"] = Relationship(
        back_populates="post",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    comments: list["PostComment"] = Relationship(
        back_populates="post",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class PostLike(TimestampMixin, SQLModel, table=True):
    """Post like model."""

    __tablename__ = "post_likes"

    post_id: UUID = Field(foreign_key="posts.id", primary_key=True, index=True)
    user_id: UUID = Field(foreign_key="users.id", primary_key=True, index=True)

    # Relationships
    post: Post = Relationship(back_populates="likes")
    user: User = Relationship()


class PostComment(BaseModel, SoftDeleteMixin, table=True):
    """Post comment model."""

    __tablename__ = "post_comments"

    post_id: UUID = Field(foreign_key="posts.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    parent_comment_id: UUID | None = Field(
        default=None,
        foreign_key="post_comments.id",
        nullable=True, 
        index=True
    )
    content: str = Field(nullable=False)
    likes_count: int = Field(default=0, ge=0)

    # Relationships
    post: Post = Relationship(back_populates="comments")
    user: User = Relationship()
    parent_comment: "PostComment | None" = Relationship(
        sa_relationship_kwargs={
            "remote_side": "PostComment.id",
            "lazy": "selectin",
        }
    )
    replies: list["PostComment"] = Relationship(
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin",
        }
    )


class UserFollow(TimestampMixin, SQLModel, table=True):
    """User follow model."""

    __tablename__ = "user_follows"

    follower_id: UUID = Field(foreign_key="users.id", primary_key=True, index=True)
    following_id: UUID = Field(foreign_key="users.id", primary_key=True, index=True)

    # Relationships
    follower: User = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[UserFollow.follower_id]",
        }
    )
    following: User = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[UserFollow.following_id]",
        }
    )
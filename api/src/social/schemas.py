"""Social domain schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class PostCreateRequest(BaseModel):
    """Create post request schema."""
    
    meal_id: UUID | None = Field(default=None, description="Associated meal ID")
    content: str | None = Field(default=None, max_length=2000, description="Post content")
    privacy: Literal["public", "friends", "private"] = Field(default="friends")


class PostUpdateRequest(BaseModel):
    """Update post request schema."""
    
    content: str | None = Field(default=None, max_length=2000)
    privacy: Literal["public", "friends", "private"] | None = Field(default=None)


class PostResponse(BaseModel):
    """Post response schema."""
    
    id: UUID
    user_id: UUID
    meal_id: UUID | None
    content: str | None
    privacy: Literal["public", "friends", "private"]
    likes_count: int
    comments_count: int
    shares_count: int
    is_featured: bool
    created_at: datetime
    updated_at: datetime
    
    # User info
    user_username: str
    user_avatar_url: str | None
    
    # Current user interaction state
    is_liked_by_user: bool = False
    is_following_user: bool = False


class PostLikeResponse(BaseModel):
    """Post like response schema."""
    
    post_id: UUID
    user_id: UUID
    created_at: datetime


class CommentCreateRequest(BaseModel):
    """Create comment request schema."""
    
    content: str = Field(..., min_length=1, max_length=1000)
    parent_comment_id: UUID | None = Field(default=None)


class CommentUpdateRequest(BaseModel):
    """Update comment request schema."""
    
    content: str = Field(..., min_length=1, max_length=1000)


class CommentResponse(BaseModel):
    """Comment response schema."""
    
    id: UUID
    post_id: UUID
    user_id: UUID
    parent_comment_id: UUID | None
    content: str
    likes_count: int
    created_at: datetime
    updated_at: datetime
    
    # User info
    user_username: str
    user_avatar_url: str | None
    
    # Nested replies (for root comments)
    replies: list["CommentResponse"] = []


class UserFollowResponse(BaseModel):
    """User follow response schema."""
    
    follower_id: UUID
    following_id: UUID
    created_at: datetime


class UserProfileResponse(BaseModel):
    """User profile response schema."""
    
    id: UUID
    username: str
    avatar_url: str | None
    is_verified: bool
    created_at: datetime
    
    # Social stats
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    
    # Current user relationship
    is_following: bool = False
    is_followed_by: bool = False


class FeedResponse(BaseModel):
    """Social feed response schema."""
    
    posts: list[PostResponse]
    has_more: bool
    next_cursor: str | None = None


class SocialStatsResponse(BaseModel):
    """Social statistics response schema."""
    
    followers_count: int
    following_count: int
    posts_count: int
    total_likes_received: int
    total_comments_received: int


# Fix forward reference
CommentResponse.model_rebuild()
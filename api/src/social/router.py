"""Social domain router."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from src.auth.dependencies import DbSession, VerifiedUser
from src.pagination import PaginationParams
from src.social.dependencies import ValidPost
from src.social.schemas import (
    CommentCreateRequest,
    CommentResponse,
    CommentUpdateRequest,
    FeedResponse,
    PostCreateRequest,
    PostResponse,
    PostUpdateRequest,
    SocialStatsResponse,
    UserProfileResponse,
)
from src.social.service import SocialService

router = APIRouter(prefix="/social", tags=["Social"])
social_service = SocialService()


# Posts endpoints
@router.post(
    "/posts",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new post",
)
async def create_post(
    post_data: PostCreateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> PostResponse:
    """Create a new social post."""
    post = await social_service.create_post(session, user.id, post_data)
    return await social_service.get_post_by_id(session, post.id, user.id)


@router.get(
    "/posts/{post_id}",
    response_model=PostResponse,
    summary="Get post by ID",
)
async def get_post(
    post: ValidPost,
    user: VerifiedUser,
    session: DbSession,
) -> PostResponse:
    """Get a specific post by ID."""
    post_response = await social_service.get_post_by_id(session, post.id, user.id)
    if not post_response:
        from src.exceptions import NotFoundError
        raise NotFoundError("Post not found")
    return post_response


@router.put(
    "/posts/{post_id}",
    response_model=PostResponse,
    summary="Update post",
)
async def update_post(
    post_id: UUID,
    update_data: PostUpdateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> PostResponse:
    """Update a post (only by owner)."""
    await social_service.update_post(session, post_id, user.id, update_data)
    post_response = await social_service.get_post_by_id(session, post_id, user.id)
    if not post_response:
        from src.exceptions import NotFoundError
        raise NotFoundError("Post not found")
    return post_response


@router.delete(
    "/posts/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete post",
)
async def delete_post(
    post_id: UUID,
    user: VerifiedUser,
    session: DbSession,
) -> None:
    """Delete a post (only by owner)."""
    await social_service.delete_post(session, post_id, user.id)


@router.post(
    "/posts/{post_id}/like",
    summary="Like or unlike a post",
)
async def toggle_post_like(
    post: ValidPost,
    user: VerifiedUser,
    session: DbSession,
) -> dict:
    """Like or unlike a post."""
    return await social_service.toggle_post_like(session, post.id, user.id)


# Feed endpoints
@router.get(
    "/feed",
    response_model=FeedResponse,
    summary="Get personalized social feed",
)
async def get_feed(
    user: VerifiedUser,
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    cursor: str | None = None,
) -> FeedResponse:
    """Get personalized social feed based on following relationships."""
    return await social_service.get_feed(session, user.id, limit, cursor)


@router.get(
    "/posts/{post_id}/comments",
    response_model=list[CommentResponse],
    summary="Get post comments",
)
async def get_post_comments(
    post: ValidPost,
    user: VerifiedUser,
    session: DbSession,
) -> list[CommentResponse]:
    """Get all comments for a post with nested replies."""
    return await social_service.get_post_comments(session, post.id, user.id)


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a comment",
)
async def create_comment(
    post: ValidPost,
    comment_data: CommentCreateRequest,
    user: VerifiedUser,
    session: DbSession,
) -> CommentResponse:
    """Create a comment on a post."""
    comment = await social_service.create_comment(
        session, post.id, user.id, comment_data
    )
    
    # Return formatted response
    from src.auth.models import User
    from sqlalchemy import select
    
    result = await session.exec(select(User).where(User.id == user.id))
    user_data = result.scalar_one()
    
    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        parent_comment_id=comment.parent_comment_id,
        content=comment.content,
        likes_count=comment.likes_count,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        user_username=user_data.username,
        user_avatar_url=user_data.avatar_url,
        replies=[],
    )


# User following endpoints
@router.post(
    "/users/{user_id}/follow",
    summary="Follow or unfollow a user",
)
async def toggle_follow_user(
    user_id: UUID,
    user: VerifiedUser,
    session: DbSession,
) -> dict:
    """Follow or unfollow a user."""
    return await social_service.follow_user(session, user.id, user_id)


@router.get(
    "/users/{user_id}/profile",
    response_model=UserProfileResponse,
    summary="Get user profile",
)
async def get_user_profile(
    user_id: UUID,
    user: VerifiedUser,
    session: DbSession,
) -> UserProfileResponse:
    """Get user profile with social statistics."""
    profile = await social_service.get_user_profile(session, user_id, user.id)
    if not profile:
        from src.exceptions import NotFoundError
        raise NotFoundError("User not found")
    return profile


@router.get(
    "/users/{user_id}/posts",
    response_model=list[PostResponse],
    summary="Get user's posts",
)
async def get_user_posts(
    user_id: UUID,
    user: VerifiedUser,
    session: DbSession,
    pagination: Annotated[PaginationParams, Query()],
) -> list[PostResponse]:
    """Get posts by a specific user."""
    from sqlalchemy import and_, desc, select
    from src.social.models import Post
    from src.auth.models import User
    
    # Build query for user's posts (respecting privacy if not owner)
    query = select(Post).where(
        and_(
            Post.user_id == user_id,
            Post.deleted_at.is_(None),
        )
    )
    
    # Apply privacy filters if not viewing own posts
    if user.id != user_id:
        from sqlalchemy import or_
        query = query.where(
            or_(
                Post.privacy == "public",
                # TODO: Add friends privacy check when friends system is implemented
            )
        )
    
    query = query.order_by(desc(Post.created_at))
    
    # Apply pagination
    result = await session.exec(query.offset(pagination.skip).limit(pagination.limit))
    posts = result.scalars().all()
    
    # Convert to response format
    responses = []
    for post in posts:
        post_response = await social_service.get_post_by_id(session, post.id, user.id)
        if post_response:
            responses.append(post_response)
    
    return responses


@router.get(
    "/me/stats",
    response_model=SocialStatsResponse,
    summary="Get my social statistics",
)
async def get_my_social_stats(
    user: VerifiedUser,
    session: DbSession,
) -> SocialStatsResponse:
    """Get current user's social statistics."""
    return await social_service.get_social_stats(session, user.id)
"""Social domain dependencies."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.auth.dependencies import DbSession, VerifiedUser
from src.social.models import Post


async def get_valid_post(
    post_id: UUID,
    session: DbSession,
) -> Post:
    """Validate post exists and is not deleted."""
    result = await session.exec(
        select(Post).where(and_(Post.id == post_id, Post.deleted_at.is_(None)))
    )
    post = result.first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )
    
    return post


async def get_owned_post(
    post: Annotated[Post, Depends(get_valid_post)],
    user: VerifiedUser,
) -> Post:
    """Validate post is owned by current user."""
    if post.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own posts",
        )
    
    return post


# Type aliases for dependencies
ValidPost = Annotated[Post, Depends(get_valid_post)]
OwnedPost = Annotated[Post, Depends(get_owned_post)]
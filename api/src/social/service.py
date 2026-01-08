"""Social domain service."""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, desc, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload

from src.auth.models import User
from src.exceptions import BadRequestError, ForbiddenError, NotFoundError
from src.social.models import Post, PostComment, PostLike, UserFollow
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


class SocialService:
    """Social domain business logic."""

    async def create_post(
        self,
        session: AsyncSession,
        user_id: UUID,
        post_data: PostCreateRequest,
    ) -> Post:
        """Create a new post."""
        post = Post(
            user_id=user_id,
            meal_id=post_data.meal_id,
            content=post_data.content,
            privacy=post_data.privacy,
        )
        
        session.add(post)
        await session.commit()
        await session.refresh(post)
        return post

    async def get_post_by_id(
        self,
        session: AsyncSession,
        post_id: UUID,
        current_user_id: UUID | None = None,
    ) -> PostResponse | None:
        """Get post by ID with user interaction state."""
        # Complex query to get post with user info and interaction state
        query = text("""
            SELECT 
                p.*,
                u.username as user_username,
                u.avatar_url as user_avatar_url,
                COALESCE(pl.user_id IS NOT NULL, false) as is_liked_by_user,
                COALESCE(uf.follower_id IS NOT NULL, false) as is_following_user
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = :current_user_id
            LEFT JOIN user_follows uf ON p.user_id = uf.following_id AND uf.follower_id = :current_user_id
            WHERE p.id = :post_id AND p.deleted_at IS NULL
        """)
        
        result = await session.exec(
            query, 
            {"post_id": str(post_id), "current_user_id": str(current_user_id) if current_user_id else None}
        )
        row = result.mappings().first()
        
        if not row:
            return None
            
        return PostResponse(**row)

    async def update_post(
        self,
        session: AsyncSession,
        post_id: UUID,
        user_id: UUID,
        update_data: PostUpdateRequest,
    ) -> Post:
        """Update post (only by owner)."""
        result = await session.exec(
            select(Post).where(and_(Post.id == post_id, Post.deleted_at.is_(None)))
        )
        post = result.first()
        
        if not post:
            raise NotFoundError("Post not found")
        
        if post.user_id != user_id:
            raise ForbiddenError("You can only edit your own posts")
        
        if update_data.content is not None:
            post.content = update_data.content
        if update_data.privacy is not None:
            post.privacy = update_data.privacy
        
        await session.commit()
        await session.refresh(post)
        return post

    async def delete_post(
        self,
        session: AsyncSession,
        post_id: UUID,
        user_id: UUID,
    ) -> None:
        """Soft delete post (only by owner)."""
        result = await session.exec(
            select(Post).where(and_(Post.id == post_id, Post.deleted_at.is_(None)))
        )
        post = result.first()
        
        if not post:
            raise NotFoundError("Post not found")
        
        if post.user_id != user_id:
            raise ForbiddenError("You can only delete your own posts")
        
        post.deleted_at = datetime.now(timezone.utc)
        await session.commit()

    async def toggle_post_like(
        self,
        session: AsyncSession,
        post_id: UUID,
        user_id: UUID,
    ) -> dict[str, Any]:
        """Like or unlike a post."""
        # Check if post exists
        result = await session.exec(
            select(Post).where(and_(Post.id == post_id, Post.deleted_at.is_(None)))
        )
        post = result.first()
        
        if not post:
            raise NotFoundError("Post not found")
        
        # Check if already liked
        result = await session.exec(
            select(PostLike).where(
                and_(PostLike.post_id == post_id, PostLike.user_id == user_id)
            )
        )
        existing_like = result.first()
        
        if existing_like:
            # Unlike
            await session.delete(existing_like)
            post.likes_count = max(0, post.likes_count - 1)
            action = "unliked"
        else:
            # Like
            new_like = PostLike(post_id=post_id, user_id=user_id)
            session.add(new_like)
            post.likes_count += 1
            action = "liked"
        
        await session.commit()
        return {"action": action, "likes_count": post.likes_count}

    async def get_feed(
        self,
        session: AsyncSession,
        user_id: UUID,
        limit: int = 20,
        cursor: str | None = None,
    ) -> FeedResponse:
        """Get personalized social feed."""
        # Get following user IDs
        following_result = await session.exec(
            select(UserFollow.following_id).where(UserFollow.follower_id == user_id)
        )
        following_ids = [row[0] for row in following_result.all()]
        
        # Include user's own posts
        following_ids.append(user_id)
        
        # Build query for posts from followed users + public posts
        query = text("""
            SELECT 
                p.*,
                u.username as user_username,
                u.avatar_url as user_avatar_url,
                COALESCE(pl.user_id IS NOT NULL, false) as is_liked_by_user,
                COALESCE(uf.follower_id IS NOT NULL, false) as is_following_user
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = :user_id
            LEFT JOIN user_follows uf ON p.user_id = uf.following_id AND uf.follower_id = :user_id
            WHERE p.deleted_at IS NULL 
                AND (
                    p.user_id = ANY(:following_ids) 
                    OR p.privacy = 'public'
                )
                AND (:cursor IS NULL OR p.created_at < :cursor_date)
            ORDER BY p.created_at DESC
            LIMIT :limit_plus_one
        """)
        
        cursor_date = None
        if cursor:
            try:
                cursor_date = datetime.fromisoformat(cursor.replace('Z', '+00:00'))
            except ValueError:
                pass
        
        result = await session.exec(query, {
            "user_id": str(user_id),
            "following_ids": following_ids,
            "cursor": cursor,
            "cursor_date": cursor_date,
            "limit_plus_one": limit + 1,
        })
        
        rows = result.mappings().all()
        posts = [PostResponse(**row) for row in rows[:limit]]
        
        has_more = len(rows) > limit
        next_cursor = None
        if has_more and posts:
            next_cursor = posts[-1].created_at.isoformat()
        
        return FeedResponse(
            posts=posts,
            has_more=has_more,
            next_cursor=next_cursor,
        )

    async def create_comment(
        self,
        session: AsyncSession,
        post_id: UUID,
        user_id: UUID,
        comment_data: CommentCreateRequest,
    ) -> PostComment:
        """Create a comment on a post."""
        # Check if post exists
        result = await session.exec(
            select(Post).where(and_(Post.id == post_id, Post.deleted_at.is_(None)))
        )
        post = result.first()
        
        if not post:
            raise NotFoundError("Post not found")
        
        # Check if parent comment exists (if provided)
        if comment_data.parent_comment_id:
            result = await session.exec(
                select(PostComment).where(
                    and_(
                        PostComment.id == comment_data.parent_comment_id,
                        PostComment.post_id == post_id,
                        PostComment.deleted_at.is_(None),
                    )
                )
            )
            parent_comment = result.first()
            if not parent_comment:
                raise BadRequestError("Parent comment not found")
        
        # Create comment
        comment = PostComment(
            post_id=post_id,
            user_id=user_id,
            parent_comment_id=comment_data.parent_comment_id,
            content=comment_data.content,
        )
        
        session.add(comment)
        
        # Update post comments count
        post.comments_count += 1
        
        await session.commit()
        await session.refresh(comment)
        return comment

    async def get_post_comments(
        self,
        session: AsyncSession,
        post_id: UUID,
        current_user_id: UUID | None = None,
    ) -> list[CommentResponse]:
        """Get comments for a post with nested replies."""
        query = text("""
            WITH RECURSIVE comment_tree AS (
                -- Root comments
                SELECT 
                    pc.*,
                    u.username as user_username,
                    u.avatar_url as user_avatar_url,
                    0 as level
                FROM post_comments pc
                JOIN users u ON pc.user_id = u.id
                WHERE pc.post_id = :post_id 
                    AND pc.parent_comment_id IS NULL 
                    AND pc.deleted_at IS NULL
                
                UNION ALL
                
                -- Nested replies
                SELECT 
                    pc.*,
                    u.username as user_username,
                    u.avatar_url as user_avatar_url,
                    ct.level + 1
                FROM post_comments pc
                JOIN users u ON pc.user_id = u.id
                JOIN comment_tree ct ON pc.parent_comment_id = ct.id
                WHERE pc.deleted_at IS NULL
            )
            SELECT * FROM comment_tree
            ORDER BY level, created_at ASC
        """)
        
        result = await session.exec(query, {"post_id": str(post_id)})
        rows = result.mappings().all()
        
        # Build nested structure
        comments_by_id = {}
        root_comments = []
        
        for row in rows:
            comment = CommentResponse(
                id=row.id,
                post_id=row.post_id,
                user_id=row.user_id,
                parent_comment_id=row.parent_comment_id,
                content=row.content,
                likes_count=row.likes_count,
                created_at=row.created_at,
                updated_at=row.updated_at,
                user_username=row.user_username,
                user_avatar_url=row.user_avatar_url,
                replies=[],
            )
            
            comments_by_id[row.id] = comment
            
            if row.parent_comment_id is None:
                root_comments.append(comment)
            else:
                parent = comments_by_id.get(row.parent_comment_id)
                if parent:
                    parent.replies.append(comment)
        
        return root_comments

    async def follow_user(
        self,
        session: AsyncSession,
        follower_id: UUID,
        following_id: UUID,
    ) -> dict[str, Any]:
        """Follow or unfollow a user."""
        if follower_id == following_id:
            raise BadRequestError("You cannot follow yourself")
        
        # Check if target user exists
        result = await session.exec(
            select(User).where(and_(User.id == following_id, User.deleted_at.is_(None)))
        )
        if not result.first():
            raise NotFoundError("User not found")
        
        # Check if already following
        result = await session.exec(
            select(UserFollow).where(
                and_(
                    UserFollow.follower_id == follower_id,
                    UserFollow.following_id == following_id,
                )
            )
        )
        existing_follow = result.first()
        
        if existing_follow:
            # Unfollow
            await session.delete(existing_follow)
            action = "unfollowed"
        else:
            # Follow
            follow = UserFollow(follower_id=follower_id, following_id=following_id)
            session.add(follow)
            action = "followed"
        
        await session.commit()
        return {"action": action}

    async def get_user_profile(
        self,
        session: AsyncSession,
        user_id: UUID,
        current_user_id: UUID | None = None,
    ) -> UserProfileResponse | None:
        """Get user profile with social stats."""
        query = text("""
            SELECT 
                u.*,
                COALESCE(followers.count, 0) as followers_count,
                COALESCE(following.count, 0) as following_count,
                COALESCE(posts.count, 0) as posts_count,
                COALESCE(is_following.follower_id IS NOT NULL, false) as is_following,
                COALESCE(is_followed_by.following_id IS NOT NULL, false) as is_followed_by
            FROM users u
            LEFT JOIN (
                SELECT following_id, COUNT(*) as count
                FROM user_follows
                GROUP BY following_id
            ) followers ON u.id = followers.following_id
            LEFT JOIN (
                SELECT follower_id, COUNT(*) as count
                FROM user_follows
                GROUP BY follower_id
            ) following ON u.id = following.follower_id
            LEFT JOIN (
                SELECT user_id, COUNT(*) as count
                FROM posts
                WHERE deleted_at IS NULL
                GROUP BY user_id
            ) posts ON u.id = posts.user_id
            LEFT JOIN user_follows is_following ON u.id = is_following.following_id 
                AND is_following.follower_id = :current_user_id
            LEFT JOIN user_follows is_followed_by ON u.id = is_followed_by.follower_id 
                AND is_followed_by.following_id = :current_user_id
            WHERE u.id = :user_id AND u.deleted_at IS NULL
        """)
        
        result = await session.exec(query, {
            "user_id": str(user_id),
            "current_user_id": str(current_user_id) if current_user_id else None,
        })
        
        row = result.mappings().first()
        if not row:
            return None
        
        return UserProfileResponse(**row)

    async def get_social_stats(
        self,
        session: AsyncSession,
        user_id: UUID,
    ) -> SocialStatsResponse:
        """Get social statistics for a user."""
        query = text("""
            SELECT 
                COALESCE(followers.count, 0) as followers_count,
                COALESCE(following.count, 0) as following_count,
                COALESCE(posts.count, 0) as posts_count,
                COALESCE(total_likes.count, 0) as total_likes_received,
                COALESCE(total_comments.count, 0) as total_comments_received
            FROM (SELECT :user_id::uuid as user_id) base
            LEFT JOIN (
                SELECT following_id, COUNT(*) as count
                FROM user_follows
                WHERE following_id = :user_id
            ) followers ON true
            LEFT JOIN (
                SELECT follower_id, COUNT(*) as count
                FROM user_follows
                WHERE follower_id = :user_id
            ) following ON true
            LEFT JOIN (
                SELECT user_id, COUNT(*) as count
                FROM posts
                WHERE user_id = :user_id AND deleted_at IS NULL
            ) posts ON true
            LEFT JOIN (
                SELECT p.user_id, COUNT(*) as count
                FROM posts p
                JOIN post_likes pl ON p.id = pl.post_id
                WHERE p.user_id = :user_id AND p.deleted_at IS NULL
                GROUP BY p.user_id
            ) total_likes ON true
            LEFT JOIN (
                SELECT p.user_id, COUNT(*) as count
                FROM posts p
                JOIN post_comments pc ON p.id = pc.post_id
                WHERE p.user_id = :user_id AND p.deleted_at IS NULL AND pc.deleted_at IS NULL
                GROUP BY p.user_id
            ) total_comments ON true
        """)
        
        result = await session.exec(query, {"user_id": str(user_id)})
        row = result.mappings().first()
        
        return SocialStatsResponse(**row)
"""Pagination utilities and schemas."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, SQLModel

from src.config import settings

T = TypeVar("T", bound=SQLModel)


class PaginationParams(BaseModel):
    """Pagination query parameters."""

    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(
        default=settings.default_page_size,
        ge=1,
        le=settings.max_page_size,
        description="Items per page",
    )
    
    @property
    def offset(self) -> int:
        """Calculate offset for database query."""
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response schema."""

    items: list[T]
    page: int
    page_size: int
    total_pages: int
    total_items: int
    has_next: bool
    has_previous: bool


async def paginate(
    session: AsyncSession,
    query: select,
    page: int = 1,
    page_size: int = settings.default_page_size,
) -> PaginatedResponse[T]:
    """
    Paginate a SQLModel query using SQLModel's exec() method.
    
    Args:
        session: Database session
        query: SQLModel select query
        page: Page number (1-indexed)
        page_size: Items per page
        
    Returns:
        PaginatedResponse with items and pagination metadata
    """
    # Count total items using SQLModel's select and exec
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.exec(count_query)
    total_items = total_result.one()
    
    # Calculate pagination
    total_pages = (total_items + page_size - 1) // page_size
    offset = (page - 1) * page_size
    
    # Get paginated items using SQLModel's exec method
    paginated_query = query.offset(offset).limit(page_size)
    result = await session.exec(paginated_query)
    items = result.all()
    
    return PaginatedResponse(
        items=items,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        total_items=total_items,
        has_next=page < total_pages,
        has_previous=page > 1,
    )


async def paginate_model(
    session: AsyncSession,
    model: type[T],
    params: PaginationParams,
    where_clause=None,
    order_by=None,
    includes=None,
) -> PaginatedResponse[T]:
    """
    Paginate a SQLModel with additional SQLModel-specific features.
    
    Args:
        session: Database session
        model: SQLModel class to query
        params: Pagination parameters
        where_clause: Optional where clause
        order_by: Optional order by clause
        includes: Optional relationships to include
        
    Returns:
        PaginatedResponse with items and pagination metadata
    """
    # Build base query using SQLModel's select
    query = select(model)
    
    if where_clause is not None:
        query = query.where(where_clause)
        
    if order_by is not None:
        query = query.order_by(order_by)
    
    # Add relationship loading if specified
    if includes:
        from sqlalchemy.orm import selectinload
        for include in includes:
            query = query.options(selectinload(include))
    
    return await paginate(
        session=session,
        query=query,
        page=params.page,
        page_size=params.page_size,
    )
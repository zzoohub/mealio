# Examples: Domain Layer

Models, errors, ports, and service implementation.

---

## Domain Models

```python
# src/domain/authors/models.py
from __future__ import annotations
from dataclasses import dataclass
from uuid import UUID

from domain.authors.errors import AuthorNameEmptyError


@dataclass(frozen=True)
class AuthorName:
    """Validated, trimmed author name. Value object."""
    value: str

    def __post_init__(self):
        trimmed = self.value.strip() if self.value else ""
        if not trimmed:
            raise AuthorNameEmptyError()
        object.__setattr__(self, "value", trimmed)

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class Author:
    """A uniquely identifiable author of blog posts."""
    id: UUID
    name: AuthorName


@dataclass(frozen=True)
class CreateAuthorRequest:
    """Fields required to create an Author. Separate from Author — they WILL diverge."""
    name: AuthorName
```

## Domain Errors

```python
# src/domain/authors/errors.py
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from domain.authors.models import AuthorName


class AuthorNameEmptyError(ValueError):
    def __init__(self):
        super().__init__("author name cannot be empty")


class CreateAuthorError(Exception):
    """Base for all create-author failures."""


class DuplicateAuthorError(CreateAuthorError):
    def __init__(self, name: AuthorName):
        self.name = name
        super().__init__(f"author with name {name.value} already exists")


class UnknownAuthorError(CreateAuthorError):
    """Wraps unexpected errors. Never expose to users — map to 500 in inbound."""
    def __init__(self, cause: Exception):
        self.cause = cause
        super().__init__(f"unexpected error: {cause}")
```

## Ports (Protocols)

```python
# src/domain/authors/ports.py
from __future__ import annotations
from typing import Protocol
from uuid import UUID

from domain.authors.models import Author, CreateAuthorRequest


class AuthorRepository(Protocol):
    """Port shaped by use cases. MUST raise DuplicateAuthorError if name exists."""
    async def create_author(self, req: CreateAuthorRequest) -> Author: ...
    async def find_author(self, author_id: UUID) -> Author | None: ...


class AuthorMetrics(Protocol):
    async def record_creation_success(self) -> None: ...
    async def record_creation_failure(self) -> None: ...


class AuthorNotifier(Protocol):
    async def author_created(self, author: Author) -> None: ...


class AuthorService(Protocol):
    """Business API consumed by inbound adapters."""
    async def create_author(self, req: CreateAuthorRequest) -> Author: ...
```

## Service Implementation

```python
# src/domain/authors/service.py
import logging

from domain.authors.errors import CreateAuthorError, UnknownAuthorError
from domain.authors.models import Author, CreateAuthorRequest
from domain.authors.ports import AuthorMetrics, AuthorNotifier, AuthorRepository

logger = logging.getLogger(__name__)


class AuthorServiceImpl:
    """Orchestrates: repo → metrics → notifications → return result."""

    def __init__(
        self,
        repo: AuthorRepository,
        metrics: AuthorMetrics,
        notifier: AuthorNotifier,
    ) -> None:
        self._repo = repo
        self._metrics = metrics
        self._notifier = notifier

    async def create_author(self, req: CreateAuthorRequest) -> Author:
        try:
            author = await self._repo.create_author(req)
        except CreateAuthorError:
            await self._metrics.record_creation_failure()
            raise
        except Exception as exc:
            await self._metrics.record_creation_failure()
            raise UnknownAuthorError(exc) from exc

        await self._metrics.record_creation_success()
        await self._notifier.author_created(author)
        return author
```

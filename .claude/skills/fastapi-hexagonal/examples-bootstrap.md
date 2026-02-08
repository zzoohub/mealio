# Examples: Bootstrap & Testing

App orchestrator, main.py, config, pyproject.toml, and hex-specific test mocks.

---

## App Orchestrator

```python
# src/app/application.py
"""Owns the event loop. Runs Shell + background workers as cooperative tasks.
For HTTP-only apps, skip this and call Shell.run() directly in main.py.
"""
import asyncio
from app.config import AppConfig
from domain.authors.service import AuthorServiceImpl
from inbound.http.shell import Shell
from outbound.postgres.repository import PostgresAuthorRepository
from outbound.prometheus import PrometheusMetrics
from outbound.email_client import EmailNotifier


class Application:
    def __init__(self, config: AppConfig) -> None:
        self.config = config

    async def run(self) -> None:
        repo = PostgresAuthorRepository(self.config.database_url)
        metrics = PrometheusMetrics()
        notifier = EmailNotifier()
        service = AuthorServiceImpl(repo, metrics, notifier)

        # TaskGroup cancels siblings on failure
        async with asyncio.TaskGroup() as tg:
            shell = Shell(self.config, service)
            tg.create_task(shell.run())
            # tg.create_task(scheduler.run())       # batch workers
            # tg.create_task(periodic_cleanup())     # periodic tasks

    def shutdown(self) -> None:
        pass
```

## Bootstrap

```python
# src/app/main.py — no FastAPI, no SQLAlchemy imports
import asyncio
from app.config import AppConfig
from app.application import Application


def main() -> None:
    config = AppConfig()
    app = Application(config)
    try:
        asyncio.run(app.run())
    except KeyboardInterrupt:
        app.shutdown()


if __name__ == "__main__":
    main()
```

```bash
uv run python -m app.main
# Or with project script:
uv run serve
```

### Alternative: Simple HTTP-only (no orchestrator)

```python
# src/app/main.py
import asyncio
from app.config import AppConfig
from domain.authors.service import AuthorServiceImpl
from inbound.http.shell import Shell
from outbound.sqlite.repository import SqliteAuthorRepository
from outbound.prometheus import PrometheusMetrics
from outbound.email_client import EmailNotifier


def main() -> None:
    config = AppConfig()
    repo = SqliteAuthorRepository(config.database_url)
    service = AuthorServiceImpl(repo, PrometheusMetrics(), EmailNotifier())
    shell = Shell(config, service)
    asyncio.run(shell.run())


if __name__ == "__main__":
    main()
```

## Configuration

```python
# src/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppConfig(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./db.sqlite"
    secret_key: str = "change-me"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000"]
    access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )
```

## pyproject.toml

```toml
[project]
name = "myapp"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.34",
    "sqlalchemy[asyncio]>=2.0",
    "aiosqlite>=0.20",
    "pydantic-settings>=2.7",
    "python-jose[cryptography]>=3.3",
    "passlib[bcrypt]>=1.7",
    "httpx>=0.28",
]

[dependency-groups]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.25",
]

[project.scripts]
serve = "app.main:main"
```

```bash
uv sync                    # install all deps from uv.lock
uv run serve               # run via project script
uv run pytest              # run tests
uv add some-package        # add dependency
uv add --dev some-tool     # add dev dependency
```

---

## Testing: Hex-Specific Mocks

### Strategy

| Layer | Mock | What to test |
|-------|------|--------------|
| Handler | Mock service | HTTP parsing, status codes, error format |
| Service | Mock repo/metrics/notifier | Orchestration, side-effect ordering |
| Adapter | Real DB | SQL, error mapping, transactions |
| E2E | Nothing mocked | Critical happy paths |

### Mocks (Protocol-compatible, no framework needed)

```python
# tests/mocks.py
from uuid import UUID
from domain.authors.errors import CreateAuthorError, UnknownAuthorError
from domain.authors.models import Author, CreateAuthorRequest


class MockAuthorRepository:
    """Stub — returns configured results."""
    def __init__(self, create_result: Author | CreateAuthorError | None = None):
        self._create_result = create_result
        self.create_calls: list[CreateAuthorRequest] = []

    async def create_author(self, req: CreateAuthorRequest) -> Author:
        self.create_calls.append(req)
        if isinstance(self._create_result, Exception):
            raise self._create_result
        return self._create_result

    async def find_author(self, author_id: UUID) -> Author | None:
        return None


class SaboteurRepository:
    """Saboteur — always raises to test error paths."""
    def __init__(self, error: Exception | None = None):
        self._error = error or UnknownAuthorError(RuntimeError("db on fire"))

    async def create_author(self, req: CreateAuthorRequest) -> Author:
        raise self._error

    async def find_author(self, author_id: UUID) -> Author | None:
        raise self._error


class SpyMetrics:
    def __init__(self):
        self.successes = 0
        self.failures = 0
    async def record_creation_success(self) -> None: self.successes += 1
    async def record_creation_failure(self) -> None: self.failures += 1


class SpyNotifier:
    def __init__(self):
        self.notifications: list[Author] = []
    async def author_created(self, author: Author) -> None:
        self.notifications.append(author)


class NoOpMetrics:
    async def record_creation_success(self) -> None: pass
    async def record_creation_failure(self) -> None: pass

class NoOpNotifier:
    async def author_created(self, author: Author) -> None: pass
```

### Test app helpers

```python
# Use Shell.build_test_app() for handler/E2E tests:
app = Shell.build_test_app(service, test_config)
async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
    response = await client.post("/authors", json={"name": "Test"})

# Use SqliteAuthorRepository.from_engine() for integration tests:
engine = create_async_engine("sqlite+aiosqlite:///:memory:")
repo = SqliteAuthorRepository.from_engine(engine)
```

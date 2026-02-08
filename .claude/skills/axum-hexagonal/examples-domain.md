# Examples: Domain Layer

Models, errors, ports, and service implementation.

---

## Domain Models

```rust
// src/domain/authors/models.rs
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Author {
    id: Uuid,
    name: AuthorName,
}

impl Author {
    pub fn new(id: Uuid, name: AuthorName) -> Self { Self { id, name } }
    pub fn id(&self) -> &Uuid { &self.id }
    pub fn name(&self) -> &AuthorName { &self.name }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthorName(String);

#[derive(Clone, Debug, Error)]
#[error("author name cannot be empty")]
pub struct AuthorNameEmptyError;

impl AuthorName {
    pub fn new(raw: &str) -> Result<Self, AuthorNameEmptyError> {
        let trimmed = raw.trim();
        if trimmed.is_empty() { Err(AuthorNameEmptyError) }
        else { Ok(Self(trimmed.to_string())) }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CreateAuthorRequest { name: AuthorName }

impl CreateAuthorRequest {
    pub fn new(name: AuthorName) -> Self { Self { name } }
    pub fn name(&self) -> &AuthorName { &self.name }
}
```

## Domain Errors

```rust
// src/domain/authors/error.rs
#[derive(Debug, Error)]
pub enum CreateAuthorError {
    #[error("author with name {name} already exists")]
    Duplicate { name: AuthorName },
    #[error(transparent)]
    Unknown(#[from] anyhow::Error),
}
```

## Ports

```rust
// src/domain/authors/ports.rs
pub trait AuthorRepository: Clone + Send + Sync + 'static {
    fn create_author(
        &self, req: &CreateAuthorRequest,
    ) -> impl Future<Output = Result<Author, CreateAuthorError>> + Send;

    fn find_author(
        &self, id: &Uuid,
    ) -> impl Future<Output = Result<Option<Author>, anyhow::Error>> + Send;
}

pub trait AuthorMetrics: Clone + Send + Sync + 'static {
    fn record_creation_success(&self) -> impl Future<Output = ()> + Send;
    fn record_creation_failure(&self) -> impl Future<Output = ()> + Send;
}

pub trait AuthorNotifier: Clone + Send + Sync + 'static {
    fn author_created(&self, author: &Author) -> impl Future<Output = ()> + Send;
}

pub trait AuthorService: Clone + Send + Sync + 'static {
    fn create_author(
        &self, req: &CreateAuthorRequest,
    ) -> impl Future<Output = Result<Author, CreateAuthorError>> + Send;
}
```

## Service Implementation

```rust
// src/domain/authors/service.rs
#[derive(Debug, Clone)]
pub struct AuthorServiceImpl<R: AuthorRepository, M: AuthorMetrics, N: AuthorNotifier> {
    repo: R, metrics: M, notifier: N,
}

impl<R: AuthorRepository, M: AuthorMetrics, N: AuthorNotifier>
    AuthorService for AuthorServiceImpl<R, M, N>
{
    async fn create_author(&self, req: &CreateAuthorRequest) -> Result<Author, CreateAuthorError> {
        let result = self.repo.create_author(req).await;
        match &result {
            Ok(author) => {
                self.metrics.record_creation_success().await;
                self.notifier.author_created(author).await;
            }
            Err(_) => self.metrics.record_creation_failure().await,
        }
        result
    }
}
```

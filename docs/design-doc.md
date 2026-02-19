# Mealio — Software Architecture Design Document

## 1. Document Info

| Field | Value |
|-------|-------|
| **Product** | Mealio |
| **Version** | 1.1.0 |
| **Last Updated** | 2026-02-19 |
| **Status** | Production + AI Analysis (Planned) |

---

## 2. System Overview

Mealio is a photo-first meal tracking app consisting of three major subsystems:

1. **Mobile Client** — React Native 0.83 / Expo 55 cross-platform app (iOS + Android)
2. **API Server** — Rust / Axum 0.8 REST API
3. **Infrastructure** — GCP Cloud Run, Cloudflare R2, Neon PostgreSQL, managed via Pulumi IaC

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile Client                         │
│         React Native 0.83 / Expo 55 / TypeScript         │
│                                                          │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐  │
│  │ Zustand  │  │ TanStack │  │  MMKV  │  │  Secure   │  │
│  │ (client) │  │  Query   │  │(persist)│  │  Store    │  │
│  └────┬─────┘  └────┬─────┘  └────┬───┘  └─────┬─────┘  │
│       │              │             │             │        │
│       └──────────────┼─────────────┘             │        │
│                      │                           │        │
│              ┌───────┴────────┐          ┌───────┴──────┐ │
│              │  API Client    │          │ Token Store  │ │
│              │ (auto-refresh) │          │ (JWT a/r)    │ │
│              └───────┬────────┘          └──────────────┘ │
└──────────────────────┼───────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────┐
│                   GCP Cloud Run                           │
│              Rust / Axum 0.8 API Server                   │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐ │
│  │   Auth   │  │  Diary   │  │  Photos   │  │  Stats  │ │
│  │ (OAuth)  │  │ (CRUD)   │  │ (Upload)  │  │ (Agg)   │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
│       │         ┌────┴─────────┐    │              │      │
│       │         │ AI Analysis  │    │              │      │
│       │         │ (tokio::spawn│    │              │      │
│       │         │  background) │    │              │      │
│       │         └────┬─────────┘    │              │      │
│       │              │              │              │      │
│       └──────────────┼──────────────┼──────────────┘      │
│                      │              │         │           │
│              ┌───────┴──────┐  ┌────┴────┐  ┌─┴────────┐ │
│              │   SQLx Pool  │  │ AWS SDK │  │ AI Vision│ │
│              │  (PgPool)    │  │ S3 (R2) │  │ API      │ │
│              └───────┬──────┘  └────┬────┘  └──────────┘ │
└──────────────────────┼──────────────┼────────────────────┘
                       │              │
              ┌────────▼───────┐  ┌───▼─────────────┐
              │ Neon PostgreSQL│  │ Cloudflare R2    │
              │ (us-east-1)   │  │ (ENAM)           │
              │ 11 tables     │  │ mealio-uploads   │
              └────────────────┘  └─────────────────┘
```

---

## 3. Architecture Decisions

### ADR-01: Monorepo Structure

**Decision**: Single repository with `/mobile`, `/api`, `/infra` directories.

**Rationale**: Shared CI/CD workflows, atomic cross-stack changes, single source of truth for infrastructure definitions.

**Trade-offs**: Larger repo size, but manageable with path-filtered CI triggers.

### ADR-02: Rust/Axum for API

**Decision**: Rust with Axum 0.8 instead of Node.js/Python.

**Rationale**:
- Compile-time SQL query verification via SQLx
- Zero-cost abstractions for high performance
- Memory safety without garbage collection
- Low Cloud Run cold-start times (~512Mi memory)

**Trade-offs**: Steeper learning curve, longer compilation, smaller ecosystem.

### ADR-03: Dual-Mode Architecture (Guest/Auth)

**Decision**: The mobile app operates in two mutually exclusive modes.

**Rationale**:
- Guest mode eliminates signup friction for first-time users
- Local-only storage (MMKV) avoids server costs for trial users
- Seamless migration path to authenticated mode

**Implementation**:
- `useEntryData()` hook abstracts the mode difference
- Guest: Zustand + MMKV (max 10 entries, UUID IDs)
- Auth: TanStack Query + API (unlimited entries, integer IDs)
- Login triggers automatic data migration

### ADR-04: Presigned URL Direct Upload

**Decision**: Clients upload photos directly to Cloudflare R2 via presigned URLs, bypassing the API server.

**Rationale**:
- Eliminates API server as a file proxy (reduces bandwidth/CPU)
- Cloud Run has a 32MB request body limit
- R2 has no egress fees

**Flow**: `POST /uploads/presign` → client PUTs to R2 → `POST /diary/{id}/photos` links the URL.

### ADR-05: Feature-Sliced Design (Mobile)

**Decision**: Mobile codebase follows FSD architecture.

**Rationale**:
- Strict import rules prevent circular dependencies
- Clear boundaries between features, entities, and shared code
- Scalable folder structure as features grow

**Layers** (top → bottom, imports only go downward):
```
app → widgets → features → entities → shared
```

### ADR-06: Three-Layer State Management

**Decision**: Three distinct state management solutions.

| Layer | Tool | Purpose |
|-------|------|---------|
| Client state | Zustand | Auth state, upload queue, UI state |
| Server state | TanStack Query | API data caching, mutations, invalidation |
| Persistence | MMKV | Guest entries, user preferences, token expiry |

**Rationale**: Each tool optimized for its domain; avoids forcing one solution for all state types.

### ADR-07: Soft Delete Pattern

**Decision**: Users and diary entries use soft delete (`deleted_at` timestamp) instead of hard delete.

**Rationale**:
- Data recovery possible
- Referential integrity preserved (photos, nutrition, ingredients)
- Compliance-friendly (deletion audit trail)

**Implementation**: All queries include `WHERE deleted_at IS NULL`.

### ADR-08: RFC 9457 Error Responses

**Decision**: All API errors return RFC 9457 Problem Detail JSON.

**Format**:
```json
{
  "type": "about:blank",
  "status": 400,
  "title": "Bad Request",
  "detail": "rating must be between 0 and 5"
}
```

**Rationale**: Standardized error format enables consistent client-side error handling. Auto-conversion from database errors (RowNotFound→404, UniqueViolation→409) reduces boilerplate.

---

## 4. Mobile Architecture

### 4.1 Project Structure (Feature-Sliced Design)

```
mobile/src/
├── app/                          # Global providers, initialization
│   └── providers/
│       └── AppProvider.tsx        # Provider composition
├── widgets/                      # Composite UI blocks
│   ├── entry-grid/               # Photo grid (FlashList)
│   └── recent-entries/           # Horizontal carousel
├── features/                     # User interactions
│   ├── auth/                     # OAuth login flow
│   │   ├── model/                # authStore, tokenStore (Zustand)
│   │   └── ui/                   # AuthFlow, GoogleAuth, AppleAuth
│   ├── capture-meal/             # Camera + meal type selection
│   │   └── ui/                   # CameraView, MealTypeSelector
│   ├── entry-detail/             # Entry editing
│   │   └── ui/                   # Edit form (TanStack Form + Zod)
│   ├── entry-feed/               # Calendar/timeline feed
│   │   └── ui/                   # Month/week views
│   ├── search-entries/           # Search & filter
│   │   └── ui/                   # Filters, search input, grid
│   └── settings/                 # User preferences
│       └── ui/                   # Settings sections
├── entities/                     # Business logic
│   ├── entry/
│   │   ├── model/                # useEntryData, useEntryStorage,
│   │   │                         # uploadQueueStore, useUploadProcessor
│   │   └── api/                  # entryApi, useEntryQueries
│   ├── meal/
│   │   └── model/                # MealPhotoData type
│   └── user/
│       ├── model/                # userStore, nutritionTargetsStore
│       └── api/                  # userApi
└── shared/
    ├── api/                      # HTTP client (auto-refresh)
    ├── config/                   # Query keys, storage keys, constants
    ├── lib/
    │   ├── i18n/                 # i18next setup, 7 namespaces
    │   ├── storage/              # MMKV wrapper (batched writes)
    │   └── query.ts              # QueryClient configuration
    ├── types/                    # Shared TypeScript types
    └── ui/                       # Reusable components
```

### 4.2 Provider Stack

```tsx
<GestureHandlerRootView>
  <ErrorBoundary>              {/* Sentry crash reporting */}
    <QueryClientProvider>      {/* TanStack Query (stale: 5m, gc: 30m) */}
      <I18nextProvider>        {/* i18next (en + ko, 7 namespaces) */}
        <ThemeProvider>        {/* Light/Dark/System theme */}
          <OverlayProvider>    {/* Toast, bottom sheet, confirm dialog */}
            <AppInitializer>   {/* Load auth state, sync offline data */}
              <UploadProcessorMount />  {/* Background upload queue */}
              {children}
            </AppInitializer>
          </OverlayProvider>
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  </ErrorBoundary>
</GestureHandlerRootView>
```

### 4.3 Navigation (Expo Router)

File-based routing with typed routes:

```
mobile/app/
├── _layout.tsx              # Root layout (Sentry, navigation)
├── index.tsx                # Home → Camera view
├── auth.tsx                 # Auth screen
├── diary/
│   ├── _layout.tsx          # Diary stack layout
│   ├── index.tsx            # Diary feed (month/week)
│   ├── search.tsx           # Search & filter
│   └── [id].tsx             # Entry detail (edit)
└── settings.tsx             # Settings
```

### 4.4 Dual-Mode Data Flow

#### Guest Mode

```
User captures photo
  → entryStorageUtils.saveEntry()
  → MMKV storage updated
  → guestEntryStore.bump() (Zustand)
  → useEntryStorage hook detects version change
  → UI re-renders
```

#### Auth Mode

```
User captures photo
  → uploadQueueStore.enqueue() (Zustand)
  → useUploadProcessor picks up pending item
  → Validate photo URIs (file://, ph://, content://, asset-library://)
  → Upload photos to R2 in parallel (presigned PUT)
  → entryApi.create() on server
  → photoApi.createPhoto() to link photos
  → POST /diary/{id}/analyze (fire & forget — triggers background AI analysis)
  → queryClient.invalidateQueries(diary.all(), statistics.all())
  → Queue item removed
  → UI shows server entry via TanStack Query
  → Entry detail polls GET /analysis until completed
```

### 4.5 API Client

```
Request flow:
1. Check token expiry (30s before actual expiry)
2. If expired → refreshAccessToken() with mutex
3. Make request with 10s timeout (AbortController)
4. On 401 → refresh token + retry once (no further retries)
5. Parse response or RFC 9457 error
```

### 4.6 Query Key Factory

```typescript
export const queryKeys = {
  diary: {
    all:     () => ['diary'] as const,
    lists:   () => [...queryKeys.diary.all(), 'list'] as const,
    list:    (filters) => [...queryKeys.diary.lists(), filters] as const,
    details: () => [...queryKeys.diary.all(), 'detail'] as const,
    detail:  (id) => [...queryKeys.diary.details(), id] as const,
  },
  statistics: {
    all: () => ['statistics'] as const,
    // ...
  },
}
```

After mutations: invalidate both `diary.all()` and `statistics.all()`.

---

## 5. API Architecture

### 5.1 Project Structure

```
api/src/
├── main.rs                    # Server setup, middleware, startup
├── lib.rs                     # AppState definition
├── error.rs                   # AppError (RFC 9457)
├── extractors.rs              # Db, AuthUser, Claims
├── response.rs                # Created<T>, Ok<T>, NoContent
├── features/
│   ├── mod.rs                 # Feature registration
│   ├── auth/                  # OAuth, JWT, JWKS
│   │   ├── router.rs          # POST sign-in, refresh, logout
│   │   ├── handlers.rs        # Token issuance, JWKS verification
│   │   └── models.rs          # User, AuthToken, Claims
│   ├── users/                 # Profile, settings
│   │   ├── router.rs          # GET/PATCH/DELETE /users/me
│   │   ├── handlers.rs        # CRUD operations
│   │   └── models.rs          # User, UserSettings
│   ├── diary/                 # Meal entries
│   │   ├── router.rs          # CRUD + location sub-routes
│   │   ├── handlers.rs        # List, create, update, delete
│   │   └── models.rs          # DiaryEntry, DiaryEntryDetail
│   ├── photos/                # Entry photos
│   │   ├── router.rs          # CRUD + set-primary
│   │   ├── handlers.rs        # Photo management
│   │   └── models.rs          # EntryPhoto
│   ├── uploads/               # Presigned URL generation
│   │   ├── router.rs          # POST /presign
│   │   └── handlers.rs        # AWS SDK presign
│   ├── nutrition/             # Per-entry nutrition data
│   │   ├── router.rs          # GET/PUT/DELETE
│   │   ├── handlers.rs        # Upsert/delete
│   │   └── models.rs          # UserNutrition
│   ├── ai_analyses/           # AI meal analysis (trigger-and-poll)
│   │   ├── router.rs          # POST /analyze (202), GET /analysis
│   │   ├── handlers.rs        # Trigger + poll + background task
│   │   └── models.rs          # AiAnalysis (status tracking)
│   ├── ingredients/           # Ingredient master + entry linking
│   │   ├── router.rs          # Search, create, link, sync, unlink
│   │   ├── handlers.rs        # Trigram search, bulk sync
│   │   └── models.rs          # Ingredient, EntryIngredient
│   └── statistics/            # Aggregated analytics
│       ├── router.rs          # nutrition, meal-types, top-ingredients, overview
│       ├── handlers.rs        # SQL aggregation queries
│       └── models.rs          # NutritionStats, MealTypeCount, TopIngredient
└── shared/
    └── types.rs               # PaginationParams, PaginationMeta, MealType, DateRange
```

### 5.2 Application State

```rust
pub struct AppState {
    pub db: PgPool,                    // Max 10 connections, 3s timeout
    pub jwt_secret: String,            // HS256 signing key
    pub google_client_id: String,      // OAuth verification
    pub apple_team_id: String,         // Apple ID verification
    pub apple_bundle_id: String,       // Apple bundle check
    pub jwks_cache: JwksCache,         // 1-hour TTL, auto-refreshed
    pub s3_client: aws_sdk_s3::Client, // R2-compatible S3 client
    pub r2_bucket: String,             // "mealio-uploads"
    pub r2_public_url: String,         // Public R2 domain
}
```

### 5.3 Middleware Stack (Order Matters)

```
Request →
  1. SentryHttpLayer          → Error tracking + performance monitoring
  2. TraceLayer               → Structured request/response tracing
  3. CorsLayer                → CORS headers (env-configurable)
  4. TimeoutLayer(30s)        → Request timeout
  5. RateLimitLayer           → Auth: 10/min, Global: 60/min (tower_governor)
  → Router → Handler → Response
```

### 5.4 Error Handling Pipeline

```
Database Error (sqlx)
  ├── RowNotFound          → 404 NotFound
  ├── UniqueViolation      → 409 Conflict
  ├── ForeignKeyViolation  → 400 BadRequest
  ├── NotNullViolation     → 400 BadRequest
  ├── CheckViolation       → 400 BadRequest
  └── Other                → 500 Internal → Sentry

JWT Error (jsonwebtoken)
  └── Any                  → 401 Unauthorized

HTTP Client Error (reqwest)
  └── Any                  → 500 Internal → Sentry

All errors → RFC 9457 Problem Detail JSON
5xx errors → Sentry auto-report
```

### 5.5 Authentication Flow

```
Client                          API Server                    Google/Apple
  │                                │                              │
  │  1. OAuth login (native SDK)   │                              │
  │  ─────────────────────────────►│                              │
  │                                │  2. Verify ID token (JWKS)   │
  │                                │  ────────────────────────────►│
  │                                │  ◄────────────────────────────│
  │                                │                              │
  │                                │  3. Find/create user         │
  │                                │  4. Hash refresh token (BLAKE3)
  │                                │  5. Store in auth_tokens     │
  │                                │  6. Issue JWT (HS256)        │
  │  ◄─────────────────────────────│                              │
  │  { access_token, refresh_token,│                              │
  │    expires_in, user }          │                              │
  │                                │                              │
  │  7. Store tokens               │                              │
  │     (expo-secure-store)        │                              │
  │  8. Store expiry (MMKV)        │                              │
```

### 5.6 Request/Response Patterns

**Handler signature**:
```rust
async fn handler(
    Db(pool): Db,           // Database pool extractor
    auth: AuthUser,         // JWT → user_id extractor
    Json(body): Json<Req>,  // Request body
) -> Result<Created<Resp>, AppError> {
    // ...
}
```

**Response types**:
- `Ok<T>` → 200 + JSON body
- `Created<T>` → 201 + JSON body
- `NoContent` → 204 (no body)

**Model pattern** (repository as static methods):
```rust
impl DiaryEntry {
    pub async fn find_by_id(pool: &PgPool, id: i64) -> Result<Self, AppError> { ... }
    pub async fn create(pool: &PgPool, req: CreateEntryReq) -> Result<Self, AppError> { ... }
    pub async fn verify_ownership(pool: &PgPool, id: i64, user_id: i64) -> Result<(), AppError> { ... }
}
```

---

## 6. Database Design

### 6.1 Schema Overview (11 Tables)

```
┌──────────────────┐     ┌────────────────────┐
│      users       │────►│ user_auth_providers │
│  (soft delete)   │     │ (provider, id)     │
└────────┬─────────┘     └────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌────────────────┐  ┌──────────────┐
│  user_settings │  │  auth_tokens │
│  (1:1, auto)   │  │  (BLAKE3)    │
└────────────────┘  └──────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│              diary_entries                     │
│  (soft delete, user_id+eaten_at index)        │
└──────┬────────┬────────┬────────┬────────────┘
       │        │        │        │
       ▼        ▼        ▼        ▼
┌──────────┐┌────────┐┌─────────┐┌──────────────┐
│entry_    ││entry_  ││user_    ││ai_analyses   │
│locations ││photos  ││nutrition││(async, poll) │
│(1:1)     ││(max 10)││(1:1)    ││              │
└──────────┘└────────┘└─────────┘└──────────────┘
                                        │
                                        │
       ┌────────────────────────────────┘
       ▼
┌──────────────────────────────────┐
│     entry_ingredients            │
│  (junction table)                │
└──────────────┬───────────────────┘
               │
               ▼
       ┌───────────────┐
       │  ingredients   │
       │ (GIN trigram)  │
       └───────────────┘
```

### 6.2 Key Tables

#### users
```sql
CREATE TABLE users (
    id           BIGSERIAL PRIMARY KEY,
    display_name TEXT,
    email        TEXT UNIQUE NOT NULL,
    photo_url    TEXT,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),
    deleted_at   TIMESTAMPTZ                  -- soft delete
);
```

#### diary_entries
```sql
CREATE TABLE diary_entries (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id),
    meal_type       meal_type NOT NULL,        -- PostgreSQL ENUM
    notes           TEXT,
    rating          SMALLINT CHECK (rating >= 0 AND rating <= 5),
    would_eat_again BOOLEAN,
    eaten_at        TIMESTAMPTZ DEFAULT now(),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ                -- soft delete
);
CREATE INDEX idx_diary_user_eaten ON diary_entries(user_id, eaten_at);
CREATE INDEX idx_diary_user_deleted ON diary_entries(user_id, deleted_at);
```

#### entry_photos
```sql
CREATE TABLE entry_photos (
    id          BIGSERIAL PRIMARY KEY,
    entry_id    BIGINT REFERENCES diary_entries(id),
    url         TEXT NOT NULL,
    caption     TEXT,
    is_primary  BOOLEAN,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_primary UNIQUE (entry_id, is_primary)
        WHERE is_primary = true,                -- at most one primary
    CONSTRAINT max_10_photos_per_entry CHECK (...) -- trigger-enforced
);
```

#### ingredients + entry_ingredients
```sql
CREATE TABLE ingredients (
    id         BIGSERIAL PRIMARY KEY,
    name       TEXT UNIQUE NOT NULL,
    category   TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ingredients_name_trgm ON ingredients
    USING gin (name gin_trgm_ops);              -- fuzzy search

CREATE TABLE entry_ingredients (
    id            BIGSERIAL PRIMARY KEY,
    entry_id      BIGINT REFERENCES diary_entries(id),
    ingredient_id BIGINT REFERENCES ingredients(id),
    amount        TEXT,
    unit          TEXT,
    UNIQUE (entry_id, ingredient_id)
);
```

### 6.3 Migrations (10 Files)

| # | File | Purpose |
|---|------|---------|
| 0001 | Extensions | `uuid-ossp`, `pg_trgm` |
| 0002 | Enums | `meal_type` (7 values) |
| 0003 | Users & Auth | users, user_auth_providers, user_settings, auth_tokens |
| 0004 | Diary & Locations | diary_entries, entry_locations |
| 0005 | Photos | entry_photos with unique primary constraint |
| 0006 | Nutrition | user_nutrition (NUMERIC(8,2) fields) |
| 0007 | AI Analyses | ai_analyses (JSONB raw_response) |
| 0008 | Ingredients | ingredients (GIN trigram), entry_ingredients |
| 0009 | Triggers | Auto-update timestamps, max 10 photos, auto-create settings |
| 0010 | AI Analysis Status | Add `status` column to `ai_analyses` (pending/processing/completed/failed) |

### 6.4 SQLx Offline Mode

The `.sqlx/` directory contains pre-compiled query metadata. CI and Docker builds use `SQLX_OFFLINE=true` to avoid needing a live database. After changing any SQL query, regenerate with `cargo sqlx prepare` against a running PostgreSQL instance.

---

## 7. Infrastructure

### 7.1 Cloud Architecture

```
GitHub Actions (CI/CD)
    │
    ├── WIF (OIDC) ──► GCP IAM Service Account
    │
    ├── cargo build + test ──► Docker Image
    │                              │
    │                    ┌─────────▼──────────┐
    │                    │  Artifact Registry  │
    │                    │  us-east4           │
    │                    └─────────┬──────────┘
    │                              │
    │                    ┌─────────▼──────────┐
    │                    │    Cloud Run        │
    │                    │  mealio-api         │
    │                    │  0-3 instances      │
    │                    │  1 CPU, 512Mi       │
    │                    │  80 concurrency     │
    │                    └──┬──────────┬───────┘
    │                       │          │
    │              ┌────────▼──┐  ┌────▼──────────┐
    │              │   Neon    │  │ Cloudflare R2  │
    │              │ PostgreSQL│  │ mealio-uploads │
    │              │ v18       │  │ ENAM region    │
    │              │ us-east-1 │  │ No egress fees │
    │              └───────────┘  └────────────────┘
    │
    ├── EAS Build ──► App Store / Play Store
    │
    └── EAS Update ──► OTA Updates (production channel)
```

### 7.2 GCP Cloud Run Configuration

| Setting | Value |
|---------|-------|
| Service name | `mealio-api` |
| Region | `us-east4` |
| Min instances | 0 (scale to zero) |
| Max instances | 3 |
| CPU | 1 |
| Memory | 512Mi |
| Concurrency | 80 |
| Timeout | 30s |
| Ingress | Public (unauthenticated) |
| Startup probe | `/health`, 4s period, 5 failures |
| Liveness probe | `/health`, 15s period |

### 7.3 Secret Management (GCP Secret Manager)

| Secret | Env Var | Purpose |
|--------|---------|---------|
| `mealio-database-url` | `DATABASE_URL` | Neon PostgreSQL connection |
| `mealio-jwt-secret` | `JWT_SECRET` | JWT HS256 signing |
| `mealio-google-client-id` | `GOOGLE_CLIENT_ID` | OAuth verification |
| `r2-account-id` | `R2_ACCOUNT_ID` | Cloudflare R2 |
| `r2-access-key-id` | `R2_ACCESS_KEY_ID` | R2 API token |
| `r2-secret-access-key` | `R2_SECRET_ACCESS_KEY` | R2 API secret |
| `mealio-api-sentry-dsn` | `SENTRY_DSN` | Error tracking |

### 7.4 Pulumi IaC

Managed via TypeScript at `/infra`:
- GCP: Cloud Run, Artifact Registry, Secret Manager, IAM (WIF)
- Cloudflare: R2 bucket
- Neon: PostgreSQL database

**Not managed** (manual setup):
- Sentry projects
- Google/Apple OAuth credentials
- EAS project config
- GCP project itself
- Cloudflare DNS records

---

## 8. CI/CD Pipelines

### 8.1 API Pipeline (`api.yml`)

```
Trigger: Push/PR to main with api/** changes

┌─────────────┐     ┌─────────────┐
│    test      │────►│   deploy    │ (push only)
│              │     │             │
│ cargo build  │     │ Docker build│
│ cargo test   │     │ Push image  │
│ SQLX_OFFLINE │     │ gcloud run  │
└─────────────┘     │ deploy      │
                    └─────────────┘
```

### 8.2 Mobile CI Pipeline (`mobile-ci.yml`)

```
Trigger: PR to main with mobile/** changes

┌─────────────┐
│    test      │
│              │
│ bun install  │
│ bun run lint │
│ bun test:ci  │
└─────────────┘
```

### 8.3 Mobile Build Pipeline (`mobile-build.yml`)

```
Trigger: Manual dispatch (platform, profile, submit)

┌─────────────┐     ┌─────────────┐
│    build     │────►│   submit    │ (optional)
│              │     │             │
│ eas build    │     │ eas submit  │
│ --platform   │     │ --latest    │
│ --profile    │     │             │
└─────────────┘     └─────────────┘
```

### 8.4 Mobile OTA Pipeline (`mobile-ota.yml`)

```
Trigger: Push to main with mobile/** changes

┌─────────────┐     ┌─────────────┐
│    test      │────►│   update    │
│              │     │             │
│ lint + test  │     │ eas update  │
│              │     │ --channel   │
│              │     │ production  │
└─────────────┘     └─────────────┘
```

---

## 9. Security Architecture

### 9.1 Authentication

| Component | Mechanism |
|-----------|-----------|
| OAuth providers | Google, Apple (JWKS-verified ID tokens) |
| Token format | JWT HS256 (access) + opaque (refresh) |
| Token storage (server) | BLAKE3 hash in `auth_tokens` table |
| Token storage (client) | `expo-secure-store` (access/refresh), MMKV (expiry only) |
| Reuse detection | Token hash comparison on refresh |
| Pre-emptive refresh | 30s before expiry, mutex-protected |

### 9.2 Authorization

| Rule | Implementation |
|------|---------------|
| All entry APIs require auth | `AuthUser` extractor (401 if missing/invalid) |
| Ownership verification | `verify_ownership(entry_id, user_id)` on every entry operation |
| Soft-deleted entries hidden | `WHERE deleted_at IS NULL` on all queries |

### 9.3 Network Security

| Layer | Protection |
|-------|-----------|
| Transport | HTTPS only (Cloud Run enforced) |
| Rate limiting | Auth: 10/min, Global: 60/min (`tower_governor`) |
| CORS | Env-configurable origins (permissive in dev only) |
| Request timeout | 30s (`tower-http`) |
| Upload expiry | Presigned URLs valid for 15 minutes |

### 9.4 Data Security

| Concern | Mitigation |
|---------|-----------|
| Token at rest | BLAKE3 hash (not plaintext) in DB |
| Mobile token storage | `expo-secure-store` (iOS Keychain / Android Keystore) |
| Error info leakage | RFC 9457 (no stack traces, generic titles) |
| SQL injection | SQLx compile-time parameterized queries |
| IANA timezone validation | Regex whitelist (alphanumeric, `/`, `_`, `-`, `+`, max 64 chars) |

---

## 10. Observability

### 10.1 Error Tracking (Sentry)

| Component | Integration |
|-----------|------------|
| API | `sentry` + `sentry-tower` + `sentry-tracing` (20% trace sampling) |
| Mobile | `@sentry/react-native` (crash reporting, ErrorBoundary) |
| Auto-report | All 5xx errors sent to Sentry with request context |
| Organization | `zzoo-org` |
| API project | `mealio-api` |
| Mobile project | `mealio-mobile` |

### 10.2 Logging

- **API**: `tracing` + `tracing-subscriber` with JSON output
- **Log level**: Configurable via `RUST_LOG` env var (default: `info`)
- **Structured**: All log entries include request ID, method, path, status, duration

### 10.3 Health Checks

- **Endpoint**: `GET /health`
- **Check**: `SELECT 1` against PostgreSQL
- **Used by**: Cloud Run startup probe (4s interval) + liveness probe (15s interval)

---

## 11. Performance Considerations

### 11.1 Database

- **Connection pool**: Max 10 connections, 3s acquire timeout
- **Indexes**: Composite indexes on hot paths (user_id + eaten_at, user_id + deleted_at)
- **Trigram search**: GIN index on `ingredients.name` for fuzzy matching
- **Pagination**: Clamped to 1-100 per page, default 20
- **Soft delete**: Index on `deleted_at` to avoid full table scans

### 11.2 Mobile

- **List rendering**: FlashList (virtualized) instead of FlatList
- **Image loading**: `expo-image` with built-in caching
- **Query caching**: staleTime 5min, gcTime 30min (reduces refetches)
- **Storage**: MMKV (JSI-based, synchronous, ~30x faster than AsyncStorage)
- **Batch writes**: 100ms debounce on MMKV operations

### 11.3 Upload

- **Direct upload**: Client → R2 (bypasses API server)
- **Parallel photos**: Multiple photos uploaded concurrently
- **Sequential entries**: One entry processed at a time (prevents race conditions)
- **Background processing**: Non-blocking UI during upload

---

## 12. Testing Strategy

### 12.1 API

- **Framework**: `cargo test`
- **SQL verification**: SQLx compile-time query checking (`SQLX_OFFLINE=true` in CI)
- **CI**: `cargo build --release` + `cargo test` on every push/PR

### 12.2 Mobile

- **Framework**: Jest 30 + ts-jest (node environment)
- **Coverage**: 38 test suites, 1,059 tests
- **CI**: `bun run lint` + `bun test:ci` (with coverage)
- **Known issue**: `bun test` crashes (Bun v1.3.8 segfault); fallback: `npx jest --no-cache`

### 12.3 Testing Patterns

- **Zustand mocks**: Re-set in `beforeEach` (cleared by `jest.clearAllMocks()`)
- **StyleSheet.flatten**: Must be mocked in component tests
- **Path aliases**: Synced across `tsconfig.json`, `babel.config.js`, `jest.config.js`
- **Barrel imports**: Adding exports to `shared/lib/utils/index.ts` may break tests with native deps

---

## 13. Internationalization

### 13.1 Architecture

- **Library**: i18next + react-i18next
- **Languages**: English (en), Korean (ko)
- **Namespaces** (7): navigation, camera, common, errors, settings, diary, auth
- **Fallback**: English

### 13.2 Type Safety

```typescript
// types.ts — Interface per namespace
interface DiaryTranslations {
  calories: string;
  protein: string;
  // ...100+ keys
}

// hooks.ts — Domain-specific hooks
export const useDiaryI18n = () => useI18n<DiaryTranslations>('diary');
```

### 13.3 Adding New Keys (3 Places)

1. **JSON files**: `locales/en/<namespace>.json` + `locales/ko/<namespace>.json`
2. **Type interface**: `types.ts`
3. **Hook** (if new namespace): `hooks.ts`

---

## 14. AI Analysis Architecture

### 14.1 Overview (Trigger-and-Poll Pattern)

The AI analysis system processes meal photos asynchronously. Entry creation is never blocked by AI processing — the analysis runs in the background and results are polled by the client.

```
[Mobile: Upload Queue Processor]
  1. Upload photos to R2 (parallel)
  2. POST /diary           → entry created (immediate)
  3. POST /diary/{id}/photos  → photos linked
  4. POST /diary/{id}/analyze → AI analysis triggered (fire & forget)
  5. Invalidate queries     → entry visible immediately

[API: POST /diary/{id}/analyze → 202 Accepted]
  1. Verify entry ownership (AuthUser.user_id)
  2. Verify entry has photos
  3. INSERT ai_analyses (status='processing', entry_id)
  4. tokio::spawn background task
  5. Return 202 Accepted immediately

[API: Background Task (tokio::spawn)]
  1. Fetch entry photo URLs from DB
  2. Call AI Vision API with photo URLs
  3. Parse nutrition data (calories, protein, fat, carbs, etc.)
  4. UPDATE ai_analyses SET status='completed', fill nutrition fields
  5. On error: UPDATE ai_analyses SET status='failed'

[Mobile: Entry Detail Screen]
  useQuery('/diary/{id}/analysis', { refetchInterval: 3000 })
  → No result / status='processing' → spinner in AI section
  → status='completed'              → display nutrition results
  → status='failed'                 → show retry button
```

### 14.2 Database Changes

```sql
-- Migration 0010: Add status column to ai_analyses
ALTER TABLE ai_analyses
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
-- Values: 'pending', 'processing', 'completed', 'failed'
```

### 14.3 API Endpoints

| Method | Path | Response | Description |
|--------|------|----------|-------------|
| POST | `/api/v1/diary/{entry_id}/analyze` | 202 Accepted | Trigger AI analysis (idempotent — skips if already processing/completed) |
| GET | `/api/v1/diary/{entry_id}/analysis` | 200 / 404 | Get analysis result with status field |

### 14.4 Cloud Run Reliability

- **Instance keep-alive**: Mobile polling requests (every 3s) keep the Cloud Run instance active while the `tokio::spawn` task runs (typically 5-30s)
- **Stuck recovery**: On server startup, find `status='processing'` with `created_at > 5 min ago` → reset to `pending` and re-process
- **Idempotent trigger**: `POST /analyze` is safe to call multiple times — returns existing analysis if already processing or completed

### 14.5 Scope Limitations

- **Guest mode**: AI analysis not available (requires auth + server-side photos)
- **No photos**: `POST /analyze` returns 400 if entry has no photos
- **Rate limiting**: Shares the existing auth rate limit (10/min)

---

## 15. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Cloud Run cold starts | Slow first request after scale-to-zero | Startup probe with 4s period; Rust binary starts fast (~100ms) |
| R2 upload failures | Photos lost | Upload queue with retry; local queue persists across app restarts |
| Token theft | Account compromise | BLAKE3 hashing, secure storage, reuse detection, short-lived access tokens |
| Guest data loss | Entries lost on uninstall | Max 10 entries limits impact; migration prompt encourages signup |
| Database connection exhaustion | API errors | Pool max 10 + 3s timeout; Cloud Run max 3 instances = max 30 connections |
| SQLx drift | Runtime query failures | Compile-time verification; `cargo sqlx prepare` in dev workflow |
| AI analysis task lost (Cloud Run scale-down) | Analysis stuck in 'processing' | Startup recovery: reset stuck tasks (>5 min) and re-process |
| AI Vision API latency/failure | Analysis never completes | Timeout + status='failed' with client-side retry button |
| AI API cost | Unexpected spend | Auth-only (no guest), shared rate limiting (10/min) |

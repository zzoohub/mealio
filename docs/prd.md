# Mealio — Product Requirements Document (PRD)

## 1. Document Info

| Field | Value |
|-------|-------|
| **Product** | Mealio |
| **Version** | 1.0.0 |
| **Last Updated** | 2026-02-19 |
| **Status** | Implemented (Production) |

---

## 2. Product Overview

Mealio is a photo-first meal tracking mobile app. Users capture a meal photo to create an entry, then optionally add nutrition data, ingredients, location, and notes. Guest mode enables instant use without signup, while authenticated mode provides unlimited entries with cloud sync.

---

## 3. User Personas

### P1: Health-Conscious Improver (Primary)

- **Profile**: 25-35, interested in health but finds logging tedious
- **Needs**: Quick, low-friction meal recording; visual retrospective
- **Pain points**: Complex food search/input in existing apps
- **Success criteria**: 1-3 photo entries per day, weekly stats review

### P2: Nutrition Tracker (Secondary)

- **Profile**: Actively dieting or exercising
- **Needs**: Macro nutrient tracking, ingredient frequency analysis
- **Pain points**: Repetitive manual nutrition input
- **Success criteria**: Nutrition logged per meal, monthly trend analysis

---

## 4. Functional Requirements

### FR-01: Authentication System

#### FR-01.1: OAuth Login

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-01.1.1 | Google OAuth 2.0 login support | P0 | Done |
| FR-01.1.2 | Apple Sign-In support | P0 | Done |
| FR-01.1.3 | Send ID token to `POST /api/v1/auth/sign-in` | P0 | Done |
| FR-01.1.4 | JWKS caching for Google/Apple token verification (1-hour TTL) | P1 | Done |
| FR-01.1.5 | Auto-create new user (display_name, email, photo_url) | P0 | Done |

#### FR-01.2: JWT Token Management

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-01.2.1 | Issue access + refresh tokens (HS256) | P0 | Done |
| FR-01.2.2 | Store access token in `expo-secure-store` | P0 | Done |
| FR-01.2.3 | Pre-emptive refresh 30s before expiry | P0 | Done |
| FR-01.2.4 | Auto-retry once on 401 response (mutex-based) | P1 | Done |
| FR-01.2.5 | Refresh token reuse detection (`auth_tokens.token_hash`, BLAKE3) | P1 | Done |
| FR-01.2.6 | `POST /api/v1/auth/refresh` — token renewal | P0 | Done |
| FR-01.2.7 | `POST /api/v1/auth/logout` — revoke refresh token | P0 | Done |

#### FR-01.3: Guest Mode

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-01.3.1 | Usable immediately without signup | P0 | Done |
| FR-01.3.2 | Store entries in MMKV local storage | P0 | Done |
| FR-01.3.3 | Maximum 10 entries (`GuestEntryLimitError`) | P0 | Done |
| FR-01.3.4 | UUID-based IDs (`entry_{timestamp}_{random}`) | P1 | Done |
| FR-01.3.5 | Migrate guest data to server upon login | P0 | Done |

---

### FR-02: Meal Capture & Entry Creation

#### FR-02.1: Camera

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-02.1.1 | Expo Camera-based camera view (home screen) | P0 | Done |
| FR-02.1.2 | Flash/torch controls | P1 | Done |
| FR-02.1.3 | Post-capture image resize | P1 | Done |
| FR-02.1.4 | Gallery photo selection (`expo-image-picker`) | P1 | Done |

#### FR-02.2: Entry Creation

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-02.2.1 | Meal type selection (breakfast, lunch, dinner, snack, dessert, drink, other) | P0 | Done |
| FR-02.2.2 | `POST /api/v1/diary` — server entry creation | P0 | Done |
| FR-02.2.3 | Default eaten_at: current time (UTC) | P1 | Done |
| FR-02.2.4 | Guest mode: save immediately to MMKV | P0 | Done |
| FR-02.2.5 | Auth mode: enqueue for background processing | P0 | Done |

#### FR-02.3: Photo Upload

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-02.3.1 | `POST /api/v1/uploads/presign` — presigned PUT URL issuance | P0 | Done |
| FR-02.3.2 | Client direct PUT upload to R2 | P0 | Done |
| FR-02.3.3 | Allowed types: image/jpeg, image/png, image/webp, image/heic | P0 | Done |
| FR-02.3.4 | Key format: `photos/{user_id}/{uuid}.{ext}` | P1 | Done |
| FR-02.3.5 | URL expiration: 15 minutes | P1 | Done |
| FR-02.3.6 | Android: use `XMLHttpRequest` (`fetch()` cannot read `file://` URIs) | P0 | Done |

#### FR-02.4: Upload Queue (Auth Mode)

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-02.4.1 | Zustand-based queue store (enqueue, markUploading, markFailed, remove, retry) | P0 | Done |
| FR-02.4.2 | Sequential processing (one at a time) | P1 | Done |
| FR-02.4.3 | Photos uploaded to R2 in parallel → entry created → photos linked → AI analysis triggered | P0 | Done |
| FR-02.4.4 | Invalidate `diary.all()` + `statistics.all()` cache on completion | P0 | Done |
| FR-02.4.5 | Retry on failure | P1 | Done |
| FR-02.4.6 | Single `<UploadProcessorMount />` in AppProvider | P1 | Done |

---

### FR-03: Entry Detail & Editing

#### FR-03.1: Entry Detail View

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-03.1.1 | `GET /api/v1/diary/{id}` — entry + location + photos + nutrition + ingredients | P0 | Done |
| FR-03.1.2 | Ownership verification (AuthUser.user_id) | P0 | Done |
| FR-03.1.3 | Exclude soft-deleted entries | P1 | Done |

#### FR-03.2: Entry Editing

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-03.2.1 | `PATCH /api/v1/diary/{id}` — meal type, notes, time, rating, would_eat_again | P0 | Done |
| FR-03.2.2 | Rating range 0-5 (or null) with server validation | P1 | Done |
| FR-03.2.3 | Client validation: TanStack Form + Zod 4 | P1 | Done |
| FR-03.2.4 | Auth mode: optimistic update | P2 | Done |

#### FR-03.3: Entry Deletion

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-03.3.1 | `DELETE /api/v1/diary/{id}` — soft delete (set deleted_at) | P0 | Done |
| FR-03.3.2 | Guest mode: remove from MMKV immediately | P0 | Done |

---

### FR-04: Photo Management

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-04.1 | `GET /api/v1/diary/{entry_id}/photos` — list photos | P0 | Done |
| FR-04.2 | `POST /api/v1/diary/{entry_id}/photos` — add photo (max 10 per entry) | P0 | Done |
| FR-04.3 | `PATCH /api/v1/diary/{entry_id}/photos/{id}` — update caption, sort order | P1 | Done |
| FR-04.4 | `DELETE /api/v1/diary/{entry_id}/photos/{id}` — delete photo | P0 | Done |
| FR-04.5 | `POST /api/v1/diary/{entry_id}/photos/{id}/primary` — set primary (atomic CTE update) | P1 | Done |
| FR-04.6 | Max 10 photos per entry enforced by DB trigger | P1 | Done |
| FR-04.7 | Sort order: is_primary DESC → sort_order ASC | P2 | Done |

---

### FR-05: Nutrition

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-05.1 | `GET /api/v1/diary/{entry_id}/nutrition` — get nutrition data | P0 | Done |
| FR-05.2 | `PUT /api/v1/diary/{entry_id}/nutrition` — upsert (calories, protein, fat, carbs, fiber, sugar, sodium) | P0 | Done |
| FR-05.3 | `DELETE /api/v1/diary/{entry_id}/nutrition` — delete | P1 | Done |
| FR-05.4 | All fields NUMERIC(8,2), nullable | P1 | Done |
| FR-05.5 | Client manual input UI (NutritionOverride component) | P0 | Done |

---

### FR-06: Ingredients

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-06.1 | `GET /api/v1/ingredients?q=` — trigram fuzzy search | P0 | Done |
| FR-06.2 | `POST /api/v1/ingredients` — create ingredient (name 1-200 chars, unique) | P1 | Done |
| FR-06.3 | `POST /api/v1/diary/{entry_id}/ingredients` — link ingredient (amount, unit) | P0 | Done |
| FR-06.4 | `PUT /api/v1/diary/{entry_id}/ingredients` — bulk sync (max 100, transactional) | P1 | Done |
| FR-06.5 | `DELETE /api/v1/diary/{entry_id}/ingredients/{ingredient_id}` — unlink | P1 | Done |
| FR-06.6 | pg_trgm GIN index-based similarity search | P1 | Done |

---

### FR-07: Location

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-07.1 | `GET /api/v1/diary/{id}/location` — get location | P1 | Done |
| FR-07.2 | `PUT /api/v1/diary/{id}/location` — upsert (name, latitude, longitude, address) | P1 | Done |
| FR-07.3 | `DELETE /api/v1/diary/{id}/location` — delete location | P2 | Done |
| FR-07.4 | Mobile location permissions (ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION) | P1 | Done |

---

### FR-08: Diary Feed

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-08.1 | `GET /api/v1/diary` — pagination (default 20, max 100 per page) | P0 | Done |
| FR-08.2 | Date range filter (timezone-aware via `AT TIME ZONE`) | P0 | Done |
| FR-08.3 | Meal type filter | P0 | Done |
| FR-08.4 | Text search (notes, location name/address, ingredient names via ILIKE) | P1 | Done |
| FR-08.5 | would_eat_again filter | P2 | Done |
| FR-08.6 | Sort: eaten_at_desc, eaten_at_asc, rating_desc | P1 | Done |
| FR-08.7 | Month/week navigation UI | P0 | Done |
| FR-08.8 | Pull-to-refresh | P1 | Done |
| FR-08.9 | Photo grid view (FlashList, 3-4 columns) | P0 | Done |
| FR-08.10 | Recent entries horizontal carousel (home screen, max 6) | P1 | Done |

---

### FR-09: Statistics

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-09.1 | `GET /api/v1/statistics/nutrition` — nutrition averages/totals | P0 | Done |
| FR-09.2 | `GET /api/v1/statistics/meal-types` — meal type frequency | P1 | Done |
| FR-09.3 | `GET /api/v1/statistics/top-ingredients` — top 20 ingredients | P1 | Done |
| FR-09.4 | `GET /api/v1/statistics/overview` — combined dashboard | P0 | Done |
| FR-09.5 | Period filter (start_date, end_date) | P1 | Done |
| FR-09.6 | Exclude soft-deleted entries | P0 | Done |

---

### FR-10: User Management

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-10.1 | `GET /api/v1/users/me` — get profile | P0 | Done |
| FR-10.2 | `PATCH /api/v1/users/me` — update name, photo | P1 | Done |
| FR-10.3 | `DELETE /api/v1/users/me` — soft delete + revoke all tokens (transactional) | P0 | Done |
| FR-10.4 | `GET /api/v1/users/me/settings` — get settings | P1 | Done |
| FR-10.5 | `PATCH /api/v1/users/me/settings` — update theme, language, notifications, privacy | P1 | Done |
| FR-10.6 | Auto-create default settings on user creation (DB trigger) | P1 | Done |

---

### FR-11: AI Meal Analysis (Trigger-and-Poll)

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-11.1 | `GET /api/v1/diary/{entry_id}/analysis` — get AI analysis result with status | P0 | Planned |
| FR-11.2 | `POST /api/v1/diary/{entry_id}/analyze` — trigger AI analysis (returns 202) | P0 | Planned |
| FR-11.3 | Analysis result: calories, nutrients, description, confidence, raw_response (JSONB) | P0 | Schema ready |
| FR-11.4 | Status tracking: pending → processing → completed / failed | P0 | Planned |
| FR-11.5 | Auto-trigger after upload queue links photos (fire & forget) | P0 | Planned |
| FR-11.6 | Background processing via `tokio::spawn` (non-blocking API response) | P0 | Planned |
| FR-11.7 | Entry detail polling: `refetchInterval: 3s` while status is processing | P0 | Planned |
| FR-11.8 | Idempotent trigger: skip if already processing or completed | P1 | Planned |
| FR-11.9 | Stuck recovery: server startup resets processing > 5 min to pending | P1 | Planned |
| FR-11.10 | Retry button on failure (re-trigger POST /analyze) | P1 | Planned |
| FR-11.11 | Auth-only (guest mode excluded) | P0 | Planned |
| FR-11.12 | Require at least one photo (400 if no photos) | P1 | Planned |

---

### FR-12: Deep Links & App Association

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-12.1 | iOS Universal Link (`mealio.zzooapp.com`) | P1 | Done |
| FR-12.2 | Android App Link (`mealio.zzooapp.com/diary/**`) | P1 | Done |
| FR-12.3 | `/.well-known/apple-app-site-association` endpoint | P1 | Done |
| FR-12.4 | `/.well-known/assetlinks.json` endpoint | P1 | Done |
| FR-12.5 | Deep link fallback (landing page when app not installed) | P2 | Done |
| FR-12.6 | URL Scheme: `mealio://` | P1 | Done |

---

## 5. Non-Functional Requirements

### NFR-01: Performance

| ID | Requirement | Implementation |
|----|------------|---------------|
| NFR-01.1 | API response timeout: 30 seconds | `TimeoutLayer(30s)` |
| NFR-01.2 | DB connection pool: max 10, timeout 3s | `PgPool::connect_with()` |
| NFR-01.3 | Mobile list virtualized rendering | FlashList (`@shopify/flash-list`) |
| NFR-01.4 | Query cache: staleTime 5min, gcTime 30min | `QueryClient` defaults |
| NFR-01.5 | MMKV batched writes (100ms debounce) | `storage.set()` default |

### NFR-02: Security

| ID | Requirement | Implementation |
|----|------------|---------------|
| NFR-02.1 | Rate limiting — auth 10req/min, global 60req/min | `tower_governor` |
| NFR-02.2 | JWT HS256 signing + BLAKE3 token hashing | `jsonwebtoken` + `blake3` |
| NFR-02.3 | CORS restrictions (production) | `CORS_ORIGINS` env var |
| NFR-02.4 | Secure token storage (mobile) | `expo-secure-store` |
| NFR-02.5 | Presigned URL 15min expiry | AWS SDK S3 |
| NFR-02.6 | Ownership verification on all entry APIs | `verify_ownership()` |
| NFR-02.7 | RFC 9457 error responses (prevent info leakage) | `AppError` → `application/problem+json` |
| NFR-02.8 | Refresh token reuse detection | `auth_tokens.token_hash` |

### NFR-03: Availability

| ID | Requirement | Implementation |
|----|------------|---------------|
| NFR-03.1 | 0-3 instance auto-scaling | GCP Cloud Run |
| NFR-03.2 | Health check (`/health`, DB SELECT 1) | Startup + Liveness probe |
| NFR-03.3 | Graceful shutdown (SIGTERM/SIGINT) | Tokio signal handler |
| NFR-03.4 | Offline recording + auto-sync | Upload queue (Zustand) |

### NFR-04: Observability

| ID | Requirement | Implementation |
|----|------------|---------------|
| NFR-04.1 | 5xx errors auto-reported to Sentry | `sentry-tower` |
| NFR-04.2 | Mobile crash tracking | `@sentry/react-native` |
| NFR-04.3 | Request tracing (20% sampling) | `sentry-tracing` |
| NFR-04.4 | Structured JSON logging | `tracing-subscriber` (json) |

### NFR-05: Internationalization

| ID | Requirement | Implementation |
|----|------------|---------------|
| NFR-05.1 | Full Korean/English UI support | i18next + 7 namespaces |
| NFR-05.2 | Type-safe translation keys | TypeScript interfaces + domain hooks |
| NFR-05.3 | Dynamic language switching | react-i18next `changeLanguage()` |
| NFR-05.4 | Timezone-aware date filtering | `AT TIME ZONE` SQL, IANA validation |

---

## 6. API Endpoints Summary

### Authentication (3 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/sign-in` | OAuth login (Google/Apple) |
| POST | `/api/v1/auth/refresh` | Token renewal |
| POST | `/api/v1/auth/logout` | Logout |

### Users (5 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Get profile |
| PATCH | `/api/v1/users/me` | Update profile |
| DELETE | `/api/v1/users/me` | Delete account |
| GET | `/api/v1/users/me/settings` | Get settings |
| PATCH | `/api/v1/users/me/settings` | Update settings |

### Diary (5 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/diary` | List entries (filter, pagination) |
| POST | `/api/v1/diary` | Create entry |
| GET | `/api/v1/diary/{id}` | Entry detail |
| PATCH | `/api/v1/diary/{id}` | Update entry |
| DELETE | `/api/v1/diary/{id}` | Delete entry |

### Location (3 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/diary/{id}/location` | Get location |
| PUT | `/api/v1/diary/{id}/location` | Upsert location |
| DELETE | `/api/v1/diary/{id}/location` | Delete location |

### Photos (5 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/diary/{entry_id}/photos` | List photos |
| POST | `/api/v1/diary/{entry_id}/photos` | Add photo |
| PATCH | `/api/v1/diary/{entry_id}/photos/{id}` | Update photo |
| DELETE | `/api/v1/diary/{entry_id}/photos/{id}` | Delete photo |
| POST | `/api/v1/diary/{entry_id}/photos/{id}/primary` | Set primary |

### Nutrition (3 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/diary/{entry_id}/nutrition` | Get nutrition |
| PUT | `/api/v1/diary/{entry_id}/nutrition` | Upsert nutrition |
| DELETE | `/api/v1/diary/{entry_id}/nutrition` | Delete nutrition |

### Ingredients (6 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/ingredients` | Search ingredients |
| POST | `/api/v1/ingredients` | Create ingredient |
| GET | `/api/v1/diary/{entry_id}/ingredients` | List entry ingredients |
| POST | `/api/v1/diary/{entry_id}/ingredients` | Link ingredient |
| PUT | `/api/v1/diary/{entry_id}/ingredients` | Bulk sync ingredients |
| DELETE | `/api/v1/diary/{entry_id}/ingredients/{id}` | Unlink ingredient |

### Uploads (1 endpoint)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/uploads/presign` | Generate presigned URL |

### Statistics (4 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/statistics/nutrition` | Nutrition stats |
| GET | `/api/v1/statistics/meal-types` | Meal type distribution |
| GET | `/api/v1/statistics/top-ingredients` | Top 20 ingredients |
| GET | `/api/v1/statistics/overview` | Combined overview |

### AI Analyses (2 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/diary/{entry_id}/analysis` | Get AI analysis result (with status) |
| POST | `/api/v1/diary/{entry_id}/analyze` | Trigger AI analysis (202 Accepted) |

### System (5 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/diary/{id}` | Deep link fallback |
| GET | `/.well-known/apple-app-site-association` | iOS app linking |
| GET | `/.well-known/assetlinks.json` | Android app linking |
| GET | `/swagger-ui` | API documentation |

**Total: 37 API endpoints + 5 system endpoints**

---

## 7. Data Model Summary

### Tables (11)

| Table | Description | Key Indexes |
|-------|-------------|-------------|
| `users` | Users (soft delete) | email (unique) |
| `user_auth_providers` | OAuth provider links | (provider, provider_id) unique |
| `user_settings` | User preferences | user_id (unique FK) |
| `auth_tokens` | Refresh token hashes | (user_id, revoked_at) |
| `diary_entries` | Meal records (soft delete) | (user_id, eaten_at), (user_id, deleted_at) |
| `entry_locations` | Entry locations | entry_id (unique FK) |
| `entry_photos` | Entry photos (max 10) | (entry_id, sort_order) |
| `user_nutrition` | User-entered nutrition | entry_id (unique FK) |
| `ai_analyses` | AI analysis results | (entry_id, created_at DESC) |
| `ingredients` | Ingredient master list | name (GIN trigram) |
| `entry_ingredients` | Entry-ingredient junction | (entry_id, ingredient_id) unique |

### Enums

- `meal_type`: breakfast, lunch, dinner, snack, dessert, drink, other

### Extensions

- `uuid-ossp` — UUID generation
- `pg_trgm` — Trigram fuzzy search

---

## 8. Navigation Structure (Mobile)

```
/ (Home)                    → Camera view + recent entries carousel
├── /auth                   → OAuth login (Google / Apple)
├── /diary                  → Month/week diary feed
│   ├── /diary/search       → Search & filter
│   └── /diary/[id]         → Entry detail/edit
└── /settings               → Account, theme, language, nutrition targets
```

---

## 9. Constraints & Assumptions

### Constraints

- Guest mode: max 10 entries (trial without server load)
- Max 10 photos per entry (enforced by DB trigger)
- Rate limiting: auth 10req/min, global 60req/min
- Pagination: max 100 items per page
- Cloud Run: max 3 instances, 80 concurrent requests
- Presigned URL: 15min expiry
- Ingredient bulk sync: max 100 items

### Assumptions

- Users will primarily capture meals using their smartphone camera
- Network connectivity may be unreliable; offline support is essential
- Korean and English are the primary usage languages
- AI analysis uses an external Vision API; processing time is 5-30 seconds per entry
- Cloud Run instances may scale down during background AI tasks; stuck recovery handles this

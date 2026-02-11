# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Mealio meal tracking app. Monorepo:
- `/mobile` — React Native 0.83 / Expo 55 / Bun
- `/api` — Rust / Axum 0.8
- `/infra` — Pulumi (GCP Cloud Run, R2, Neon)

## Build & Dev Commands

### Mobile (`cd mobile`)
```bash
bun start                          # Expo dev server
bun run ios                        # Build & run on iOS simulator
bun run android                    # Build & run on Android emulator
bun run lint                       # ESLint
bun test                           # Jest (all tests)
bun test -- --testPathPattern=auth # Run single test file matching "auth"
bun test -- --watch                # Watch mode
```
**Known issue:** `bun test` crashes (Bun v1.3.8 segfault). Use `npx jest --no-cache` as fallback.

Tests live in `src/**/__tests__/**/*.(test|spec).(ts|tsx)`.

### API (`cd api`)
```bash
docker compose up -d               # Start local PostgreSQL (postgres:18-alpine, port 5432)
cargo run                           # Run dev server (port 3000)
cargo test                          # Run all tests
cargo test error                    # Run tests matching "error"
cargo build --release               # Release build
cargo sqlx prepare                  # Regenerate .sqlx/ after query changes (needs live DB)
```
Swagger UI available at `http://localhost:3000/swagger-ui` when running.

## Infrastructure
- Database: Neon (PostgreSQL)
- API: GCP Cloud Run (us-east4, scales to zero)
- Object Storage: Cloudflare R2 (direct upload via presigned URLs)
- Email: Cloudflare Email Routing
- Error tracking: Sentry
- Analytics: PostHog
- IaC: Pulumi (`/infra`) — manages Cloud Run, Secret Manager, Artifact Registry, R2, Neon; does NOT manage secret values

## Principles (MUST CONFORM TO)
1. All implementation must use skills (even if after plan mode.)
   - mobile: Use **react-native** skill
   - api: Use **axum** skill + **postgresql** skill for queries
2. Once the implementation is complete, run the two sub-agents below in parallel.
   - Run a **security-reviewer** sub-agent for security audit → fix
   - Run a **tester** sub-agent for testing only changed code → fix

## API

All routes are nested under `/api/v1` (e.g. `/api/v1/auth/login`, `/api/v1/diary`). Migrations run automatically on startup from `./migrations` (9 files, 0001–0009).

Additional top-level routes: `/health` (DB check), `/diary/{id}` (deep link fallback), `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`.

### Workflow
1. **data-modeling** → **database-reviewer** (agent) → **api-design** (plan)
2. **axum** (implementation) + **postgresql** (queries)
3. `cargo build --release`

### Folder Structure (`api/src/`)
```
main.rs
lib.rs                 # AppState (PgPool, JWT, OAuth, S3/R2 client)
error.rs               # AppError (RFC 9457)
extractors.rs          # Db, AuthUser, Claims extractors
response.rs            # Created<T>, Ok<T>, NoContent
features/
  ├── mod.rs
  ├── auth/            # OAuth (Google, Apple), JWT, JWKS caching
  ├── users/           # Profile, settings
  ├── diary/           # Meal entries
  ├── photos/          # Entry photos
  ├── uploads/         # Presigned URL generation for R2
  ├── nutrition/       # User nutrition overrides
  ├── ai_analyses/     # AI meal analysis (stub — returns 501)
  ├── ingredients/     # Ingredient master list
  └── statistics/      # Aggregated stats
shared/                # Cross-feature utilities
migrations/            # SQL migrations (0001-0009)
.sqlx/                 # Compiled query cache (SQLX_OFFLINE=true for Docker/CI)
```

Each feature follows: `mod.rs`, `router.rs`, `handlers.rs`, `models.rs`.

### Conventions
- **Models**: Entity struct + repository as static methods (`User::find`, `User::create`)
- **Handlers**: Return `Result<ResponseType<T>, AppError>`
- **Errors**: RFC 9457 (`application/problem+json`). Auto-converts: `RowNotFound`→404, unique violation (23505)→409, FK/null/check→400, JWT→401, reqwest→500. 5xx errors auto-reported to Sentry.
- **Response types**: `Created<T>` (201), `Ok<T>` (200), `NoContent` (204)
- **Auth**: `AuthUser` extractor parses JWT Bearer token → `user_id: i64`
- **Cross-feature**: If used by 2+ features → `shared/`
- **Photo uploads**: Client gets presigned URL from `POST /api/v1/uploads/presign`, uploads directly to R2, then links via API. Allowed types: jpeg, png, webp, heic. Key format: `photos/{user_id}/{uuid}.{ext}`.

### SQLx Offline Mode
The `.sqlx/` directory contains pre-compiled query metadata for building without a live DB. **After changing any SQL query**, regenerate with `cargo sqlx prepare` (requires running PostgreSQL). CI and Docker builds use `SQLX_OFFLINE=true`.

### Middleware Stack
Rate limiting (auth: 10/min, global: 60/min via `tower_governor`), 30s request timeout, CORS (permissive in dev, explicit origins in prod via `CORS_ORIGINS` env var), Sentry tracing.

## Mobile

### Workflow
1. **react-native** (implementation)
2. **vercel-react-native-skills** (review) (must be reviewed)

### Dual-Mode Architecture
The app runs in **auth mode** (API + TanStack Query) or **guest mode** (MMKV local storage + Zustand).
- **Guest**: Max 10 entries, UUID IDs, no AI analysis, stored in MMKV
- **Auth**: Unlimited entries, integer IDs, full feature set, server state via TanStack Query
- `useEntryData` hook abstracts the difference — callers don't need to know which mode is active
- Auth tokens: access/refresh in `expo-secure-store`, expiry in MMKV (pre-emptive refresh 30s before expiry)

### Upload Queue
Background upload processor mounted once in `AppProvider` as `<UploadProcessorMount />`. Flow: save entry → queue (Zustand) → process one at a time (upload photos to R2 in parallel → create entry → link photos) → invalidate `diary.all()` + `statistics.all()`.

### Folder Structure (`mobile/src/`) — Feature-Sliced Design
```
src/
├── app/             # Providers, global config
├── widgets/         # Composite blocks (entry-grid, recent-entries)
├── features/        # User interactions (auth, capture-meal, diary-feed, etc.)
│   └── [feature]/
│       └── ui/, model/, api/
├── entities/        # Business entities (user, meal, entry)
│   └── [entity]/
│       └── ui/, model/, api/
└── shared/          # ui/, lib/, api/, config/, types/
```
Routes in `mobile/app/` (Expo Router file-based routing, typed routes enabled).

### FSD Import Rules
app → widgets → features → entities → shared (never import upward)

### Conventions
- **Features**: Each has `model/` (Zustand + hooks), `ui/` (pure components), `index.ts` (barrel)
- **State**: Zustand for client, TanStack Query for server, MMKV for persistence
- **Forms**: TanStack Form + Zod 4 validation
- **i18n**: i18next + react-i18next (en + ko). Namespaces: navigation, camera, common, errors, settings, diary, auth. When adding keys, update 3 places: JSON files (en + ko), `types.ts` interface, `hooks.ts` helper.
- **Lists**: FlashList (`@shopify/flash-list`) over FlatList
- **Images**: `expo-image` (not React Native `Image`)
- **API client** (`shared/api/client.ts`): Auto token refresh with mutex, 10s timeout, retry once on 401. Base URL: `localhost:3000/api` in dev, Cloud Run in prod.

### Query Keys Management
Colocate a key factory in each entity/feature `api/` folder. Keys go generic → specific.
```ts
export const entryKeys = {
  all: ['entries'] as const,  // invalidate everything
  lists: () => [...entryKeys.all, 'list'] as const,    // all lists
  list: (filters) => [...entryKeys.lists(), filters] as const, // specific list
  details: () => [...entryKeys.all, 'detail'] as const,  // all details
  detail: (id) => [...entryKeys.details(), id] as const,   // single detail
}
```
After mutations, invalidate BOTH `diary.all()` and `statistics.all()`.

### Testing Gotchas
- Jest uses `ts-jest` preset with `node` environment (not `jest-expo`)
- `StyleSheet.flatten` must be mocked in component tests (see existing tests for pattern)
- Zustand store mocks break after `jest.clearAllMocks()` — re-mock in `beforeEach`
- Path aliases must stay in sync across `tsconfig.json`, `babel.config.js`, and `jest.config.js`

### Path Aliases
```
@/*          → ./src/*
@/features/* → ./src/features/*
@/entities/* → ./src/entities/*
@/shared/*   → ./src/shared/*
@/lib/*      → ./src/shared/lib/*
@/constants/* → ./src/shared/config/*
@/types/*    → ./src/shared/types/*
@/providers/* → ./src/app/providers/*
@/assets/*   → ./assets/*
```

## CI/CD (`.github/workflows/`)
- **api.yml**: On push/PR to `main` with `api/**` changes — `cargo build --release` + `cargo test` (SQLX_OFFLINE=true), then deploy to Cloud Run via WIF + Artifact Registry
- **mobile-ci.yml**: Test on PR
- **mobile-build.yml**: EAS build on push
- **mobile-ota.yml**: EAS Update for OTA

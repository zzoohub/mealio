# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Mealio meal tracking app. Monorepo:
- `/mobile` — React Native 0.83 / Expo 55 / Bun
- `/api` — Rust / Axum 0.8

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
Tests live in `src/**/__tests__/**/*.(test|spec).(ts|tsx)`.

### API (`cd api`)
```bash
docker compose up -d               # Start local PostgreSQL (postgres:18-alpine, port 5432)
cargo run                           # Run dev server (port 3000)
cargo test                          # Run all tests
cargo test error                    # Run tests matching "error"
cargo build --release               # Release build
```
Swagger UI available at `http://localhost:3000/swagger-ui` when running.

## Infrastructure
- Database: AWS RDS PostgreSQL via Cloudflare Hyperdrive
- API: Cloudflare Workers
- Queue: Cloudflare Queues
- Object Storage: Cloudflare R2
- Cache: Cloudflare KV
- Email: Cloudflare Email Routing
- Error tracking: Sentry
- Analytics: PostHog

## Principles (MUST CONFORM TO)
1. All implementation must use skills (even if after plan mode.)
   - mobile: Use **react-native** skill
   - api: Use **axum** skill + **postgresql** skill for queries
2. After any implementation
   - Use **security-guidance** plugin for security audit → fix
   - Run a **tester** sub-agent that runs in parallel on the implemented code.
**100% test coverage is not optional**

## API

All routes are nested under `/api/v1` (e.g. `/api/v1/auth/login`, `/api/v1/diary`). Migrations run automatically on startup.

### Workflow
1. **data-modeling** → **database-reviewer** (agent) → **api-design** (plan)
2. **axum** (implementation) + **postgresql** (queries)
3. `cargo build --release`

### Folder Structure (`api/src/`)
```
main.rs
lib.rs                 # AppState, re-exports
error.rs               # AppError (RFC 9457)
extractors.rs          # Db, AuthUser, Claims extractors
response.rs            # Created<T>, Ok<T>, NoContent
features/
  ├── mod.rs
  ├── auth/            # OAuth (Google, Apple), JWT, JWKS
  ├── users/           # Profile, settings
  ├── diary/           # Meal entries
  ├── photos/          # Entry photos
  ├── nutrition/       # User nutrition overrides
  ├── ai_analyses/     # AI meal analysis
  ├── ingredients/     # Ingredient master list
  └── statistics/      # Aggregated stats
shared/                # Cross-feature utilities
migrations/            # SQL migrations (0001-0009)
.sqlx/                 # Compiled query cache
```

Each feature follows: `mod.rs`, `router.rs`, `handlers.rs`, `models.rs`.

### Conventions
- **Models**: Entity struct + repository as static methods (`User::find`, `User::create`)
- **Handlers**: Return `Result<ResponseType<T>, AppError>`
- **Errors**: RFC 9457 via `AppError`, auto-converts from sqlx/jsonwebtoken/reqwest errors
- **Response types**: `Created<T>` (201), `Ok<T>` (200), `NoContent` (204)
- **Auth**: `AuthUser` extractor parses JWT Bearer token → `user_id: i64`
- **Cross-feature**: If used by 2+ features → `shared/`

## Mobile

### Workflow
1. **react-native** (implementation)
2. **vercel-react-native-skills** (review)

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
Routes in `mobile/app/` (Expo Router file-based routing).

### FSD Import Rules
app → widgets → features → entities → shared (never import upward)

### Conventions
- **Features**: Each has `model/` (Zustand + hooks), `ui/` (pure components), `index.ts` (barrel)
- **State**: Zustand for client, TanStack Query for server, MMKV for persistence
- **Forms**: TanStack Form + Zod 4 validation
- **i18n**: i18next + react-i18next
- **Lists**: FlashList (`@shopify/flash-list`) over FlatList
- **Images**: `expo-image` (not React Native `Image`)

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

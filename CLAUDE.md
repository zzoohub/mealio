# CLAUDE.md

## Project Overview
Mealio meal tracking app. Monorepo:
- `/mobile` — React Native / Expo 55 / Bun
- `/api` — Rust / Axum (skeleton, early stage)

## Infrastructure
- Database: AWS RDS with Cloudflare Hyperdrive
- API: Cloudflare Workers
- Queue: Cloudflare Queues
- ObjectStorage: Cloudflare R2
- Cache: Cloudflare KV
- Email: Resend

## Observability
- Error tracking: Sentry
- Analytics: PostHog

## Principles
1. All implementation must use skills
   - mobile: **react-native** skill
   - api: **axum** skill + **postgresql** skill for queries
2. After any implementation
   - **security-guidance** plugin for security audit → fix
   - **tester** agent for decide(needs test?) → write → test run

## API

### Workflow
1. **data-modeling** → **database-reviewer** (agent) → **api-design** (plan)
2. **axum** (implementation) + **postgresql** (queries)
3. `cargo build --release`

### Folder Structure (`api/src/`)
```
main.rs
lib.rs                 # AppState, re-exports
error.rs               # AppError (RFC 9457)
extractors.rs          # Db extractor
response.rs            # Created<T>, Ok<T>, NoContent
features/
  ├── mod.rs
  ├── users/
  │   ├── mod.rs
  │   ├── router.rs
  │   ├── handlers.rs
  │   └── models.rs    # Entity + repository  
  └── auth/
shared/                # Cross-feature utilities
migrations/
.sqlx/
```

### Conventions
- **Models**: Entity struct + repository as static methods (`User::find`, `User::create`)
- **Handlers**: Return `Result<ResponseType<T>, AppError>`
- **Errors**: RFC 9457 via `AppError`, DB errors auto-convert
- **Response types**: `Created<T>` (201), `Ok<T>` (200), `NoContent` (204)
- **Cross-feature**: If used by 2+ features → `shared/`

### Core Stack
| Layer | Technology |
|-------|------------|
| Framework | Axum 0.8+ |
| Database | SQLx + PostgreSQL |
| Auth | JWT (argon2id passwords) |
| Middleware | Tower layers |

## Mobile

### Workflow
1. **react-native** (implementation)
2. **vercel-react-native-skills** (review)

### Folder Structure (`mobile/src/`) — Feature-Sliced Design
```
app/                 # Expo Router (file-based routing)
  src/
  ├── app/             # Providers, global config
  ├── widgets/         # Composite blocks (Header, Sidebar, Feed)
  ├── features/        # User interactions (auth, cart, comments)
  │   └── [feature]/
  │       └── ui/, model/, api/
  ├── entities/        # Business entities (user, product, order)
  │   └── [entity]/
  │       └── ui/, model/, api/
  └── shared/          # ui/, lib/, api/, config/
```

### Conventions
- **Features**: Each has `model/` (Zustand + hooks), `ui/` (pure components), `index.ts` (barrel)
- **State**: Zustand for client, TanStack Query for server, MMKV for persistence
- **Routing**: Expo Router file-based in `mobile/app/`

### Path Aliases
`@/*` → `./src/*` | `@/features/*` | `@/entities/*` | `@/shared/*` | `@/lib/*` → `./src/shared/lib/*`

# CLAUDE.md

## Project Overview
Mealio meal tracking app. Monorepo:
- `/mobile` — React Native / Expo 55 (primary) / bun
- `/api` — Rust / Axum (skeleton, early stage)

## Workflow

### api server
1. Use **data-modeling** skill for database design and any schema changes
2. Use **database-reviewer** agent after **data-modeling** skill
3. Use **api-design** skill for api design
4. MUST Use **axum** skill for any api implementation. because it has best practices and project structure. for writing queries use **postgresql** skill
5. check success build (cargo build --release)
- Common workflow
  **data-modeling** -> **database-reviewer** (agent) -> **api-design** (plan) -> **axum** (implementation) and **postgresql** (queries) -> build test

### mobile application
1. MUST Use **expo-react-native** skill for any mobile implementation. because it has best practices and project structure.
2. Use **vercel-react-native-skills** skill for review and modify focus on specific logic 
- Common workflow
  **expo-react-native** (implementation) -> **vercel-react-native-skills** (review)


### After Any Implementation

- Use **security-guidance** plugin for security audit -> fix
- Use **tester** agent for decide(needs test?) -> write -> test run

## Mobile 

### Architecture (`mobile/src/`) Feature Dliced Design
```
app/           # Providers, composition root
features/      # Feature modules (model/, ui/, index.ts)
entities/      # Business entity types
shared/        # ui/, lib/, config/, types/
```

### Conventions
- **Features**: Each has `model/` (Zustand + hooks), `ui/` (pure components), `index.ts` (barrel)
- **State**: Zustand for client, TanStack Query for server, MMKV for persistence
- **Routing**: Expo Router file-based in `mobile/app/`

### Path Aliases
`@/*` → `./src/*` | `@/features/*` | `@/entities/*` | `@/shared/*` | `@/lib/*` → `./src/shared/lib/*`


## API
### Architecture (`api/src/`) Feature-Sliced
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
      └── ...
shared/                # Cross-feature utilities
  └── types.rs
migrations/
.sqlx/
```

### Conventions
- **Models**: Entity struct + repository as static methods (`User::find`, `User::create`)
- **Handlers**: Return `Result<ResponseType<T>, AppError>`
- **Errors**: RFC 9457 via `AppError`, DB errors auto-convert
- **Response types**: `Created<T>` (201), `Ok<T>` (200), `NoContent` (204)
- **Cross-feature**: If used by 2+ features → `shared/`

### Stack
| Layer | Technology |
|-------|------------|
| Framework | Axum 0.8+ |
| Database | SQLx + PostgreSQL |
| Auth | JWT (argon2id passwords) |
| Middleware | Tower layers |

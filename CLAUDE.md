# CLAUDE.md

## Project Overview
Mealio meal tracking app. Monorepo:
- `/mobile` — React Native / Expo 55 (primary) / bun
- `/api` — Rust / Axum (skeleton, early stage)

## Workflow 

### api 
1. Use **data-modeling** skill for database design and any schema changes
2. Use **database-reviewer** agent after **data-modeling** skill
3. Use **api-design** skill for api design
4. MUST Use **axum** skill for any api implementation. because it has best practices and project structure.
5. Use **postgresql** skill for writing queries
- Common workflow
  **data-modeling** -> **database-reviewer** (agent) -> **api-design** (plan) -> **axum** (implementation)

### mobile implementation
1. MUST Use **expo-react-native** skill for any mobile implementation. because it has best practices and project structure.
2. Use **vercel-react-native-skills** skill for review and modify focus on specific logic 
- Common workflow
  **expo-react-native** (implementation) -> **vercel-react-native-skills** (review)


### After Any Implementation

- Use **code-review** plugin for review -> fix
- Use **security-guidance** plugin for review -> fix
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

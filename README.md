# Mealio

A photo-first meal tracking app. Snap a photo, log your meal, and track your nutrition over time.

## Overview

Mealio replaces tedious manual food logging with camera-based meal tracking. Users photograph their meals, manually record nutritional information, and maintain a visual food diary over time.

**Key features:**
- **Photo-first capture** — Camera is the primary action; log a meal in under 15 seconds
- **Nutrition tracking** — Record calories, macros, and ingredients for each meal
- **Visual diary** — Week-based calendar with meal photo cards
- **Statistics** — Track nutrition trends, meal type distribution, and top ingredients
- **Bilingual** — Full English and Korean localization
- **Guest mode** — Use the app without an account (local storage only)

## Tech Stack

### Mobile (`/mobile`)
| Category | Technology |
|---|---|
| Framework | React Native 0.83, Expo 55 |
| Language | TypeScript 5.9 |
| Navigation | Expo Router (file-based) |
| State | Zustand 5 (client), TanStack Query 5 (server), MMKV (persistence) |
| Forms | TanStack Form + Zod 4 |
| UI | Reanimated 4, FlashList, expo-image |
| Auth | Google Sign-In, Apple Authentication |
| Camera | expo-camera, expo-image-picker |
| Maps | react-native-maps, expo-location |
| i18n | i18next + react-i18next |
| Monitoring | Sentry |

### API (`/api`)
| Category | Technology |
|---|---|
| Framework | Axum 0.8 |
| Language | Rust (2021 edition) |
| Database | PostgreSQL 18 (Neon) |
| ORM | SQLx 0.8 (compile-time checked queries) |
| Auth | JWT + JWKS (Google & Apple OAuth) |
| Storage | Cloudflare R2 (S3-compatible) |
| Docs | OpenAPI via utoipa + Swagger UI |
| Monitoring | Sentry, tracing |

### Infrastructure
| Service | Provider |
|---|---|
| Database | Neon (PostgreSQL) |
| API hosting | GCP Cloud Run |
| Object storage | Cloudflare R2 |
| Email | Cloudflare Email Routing |
| Error tracking | Sentry |
| Analytics | PostHog |
| Mobile builds | EAS (Expo Application Services) |

## Project Structure

```
mealio/
├── mobile/                    # React Native / Expo app
│   ├── app/                   # Expo Router routes
│   │   ├── index.tsx          # Splash / entry point
│   │   ├── auth.tsx           # Sign-in screen
│   │   ├── settings.tsx       # User settings
│   │   └── diary/             # Diary screens
│   └── src/                   # Feature-Sliced Design
│       ├── app/               # Providers, global config
│       ├── widgets/           # Composite UI blocks
│       ├── features/          # User interactions
│       ├── entities/          # Business entities
│       └── shared/            # Reusable utilities & UI
├── api/                       # Rust / Axum API
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs             # AppState
│   │   ├── features/          # Route modules
│   │   │   ├── auth/          # OAuth, JWT, JWKS
│   │   │   ├── users/         # Profile & settings
│   │   │   ├── diary/         # Meal entries
│   │   │   ├── photos/        # Entry photos
│   │   │   ├── nutrition/     # Nutrition overrides
│   │   │   ├── ai_analyses/   # AI meal analysis
│   │   │   ├── ingredients/   # Ingredient list
│   │   │   └── statistics/    # Aggregated stats
│   │   └── shared/            # Cross-feature utilities
│   └── migrations/            # SQL migrations
└── docs/                      # Architecture & PRD
```

The mobile app follows **Feature-Sliced Design** with strict import rules: `app → widgets → features → entities → shared` (no upward imports).

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (for mobile package management)
- [Rust](https://rustup.rs/) (for the API)
- [Docker](https://www.docker.com/) (for local PostgreSQL)
- iOS Simulator (Xcode) or Android Emulator

### Mobile

```bash
cd mobile
bun install
bun start              # Start Expo dev server
bun run ios            # Build & run on iOS simulator
bun run android        # Build & run on Android emulator
```

### API

```bash
cd api
cp .env.example .env   # Configure environment variables
docker compose up -d   # Start local PostgreSQL
cargo run              # Start dev server (port 3000)
```

Swagger UI is available at `http://localhost:3000/swagger-ui` when the server is running.

## API Endpoints

All routes are prefixed with `/api/v1/`. Migrations run automatically on startup.

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/sign-in`, `/auth/refresh`, `/auth/revoke` |
| Users | `GET/PATCH/DELETE /users/me`, `/users/me/settings` |
| Diary | `GET/POST /diary`, `GET/PATCH/DELETE /diary/{id}`, location sub-routes |
| Photos | `GET/POST /diary/{id}/photos`, `PATCH/DELETE /diary/{id}/photos/{id}` |
| Nutrition | `GET/POST/PATCH /diary/{id}/nutrition` |
| AI Analysis | `GET/POST /diary/{id}/analysis` |
| Ingredients | Ingredient master list and entry-ingredient associations |
| Statistics | `/statistics/nutrition`, `/meal-types`, `/top-ingredients`, `/overview` |
| Uploads | `POST /uploads/presign` (presigned URLs for direct R2 upload) |
| Health | `GET /health` |

## Testing

### Mobile
```bash
cd mobile
bun test                           # Run all tests
bun test -- --testPathPattern=auth # Run tests matching "auth"
bun test -- --watch                # Watch mode
```

### API
```bash
cd api
cargo test             # Run all tests
cargo test error       # Run tests matching "error"
```

## Environment Variables

### API (`api/.env`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `R2_ACCOUNT_ID` | Cloudflare R2 account |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | R2 public URL |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `APPLE_BUNDLE_ID` | iOS bundle identifier |
| `CORS_ORIGINS` | Allowed CORS origins |
| `SENTRY_DSN` | Sentry error tracking DSN |

### Mobile (`mobile/.env`)
| Variable | Description |
|---|---|
| `GOOGLE_MAP_API_KEY` | Google Maps API key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client ID |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN |

## Deployment

- **API**: Multi-stage Docker build → GCP Cloud Run (us-east4, autoscaling 0–3 instances)
- **Mobile**: EAS Build → App Store (iOS) / Play Store (Android)
- **Database**: Neon (managed PostgreSQL)
- **Storage**: Cloudflare R2 with presigned URL uploads

## License

Private. All rights reserved.

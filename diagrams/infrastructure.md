# Infrastructure Components

## Overview

Mealio is a photo-first meal tracking application deployed across Google Cloud Platform and Cloudflare. The API runs as a containerized Rust service on GCP Cloud Run (us-east4), backed by a Neon-managed PostgreSQL 18 database and Cloudflare R2 object storage for photo uploads. The mobile client is built via Expo Application Services (EAS) and distributed through the iOS App Store and Android Play Store. Error tracking is handled by Sentry across both API and mobile, and PostHog is listed as the analytics provider.

## Components

### Compute

#### GCP Cloud Run -- `mealio-api`

- **Purpose**: Hosts the Rust/Axum API server serving all backend endpoints under `/api/v1/`.
- **Region**: `us-east4`
- **Image**: `us-east4-docker.pkg.dev/mealio-483914/services/api:latest`
- **GCP Project ID**: `mealio-483914` (derived from the Artifact Registry path and the production URL)
- **Container port**: 8080
- **CPU**: 1 core
- **Memory**: 512Mi
- **Autoscaling**: 0 (scale-to-zero) to 3 instances
- **Container concurrency**: 80 concurrent requests per instance
- **Request timeout**: 300 seconds
- **Startup CPU boost**: enabled (allocates extra CPU during cold start)
- **Startup probe**: HTTP GET `/health`, period 4s, failure threshold 5
- **Liveness probe**: HTTP GET `/health`, period 15s
- **Runtime base image**: `debian:trixie-slim` (multi-stage build from `rust:1.92-slim`)
- **Process user**: `appuser` (UID 1001, non-root)
- **Graceful shutdown**: Listens for SIGINT via `tokio::signal::ctrl_c()`
- **Request timeout middleware**: 30 seconds at the application layer (`tower_http::timeout::TimeoutLayer`)
- **Source**: `api/service.yaml` (lines 1-85), `api/Dockerfile` (lines 1-20), `api/src/main.rs` (lines 121-142)

#### GCP Artifact Registry

- **Purpose**: Docker container image registry for the API service.
- **Repository path**: `us-east4-docker.pkg.dev/mealio-483914/services`
- **Region**: `us-east4`
- **Image name**: `api`
- **Tag strategy**: `latest` (no versioned tags observed in IaC)
- **Source**: `api/service.yaml` (line 20)

#### Expo Application Services (EAS)

- **Purpose**: Cloud build and submission service for the React Native mobile app.
- **CLI version requirement**: >= 16.32.0
- **App version source**: `remote` (EAS manages version numbers)
- **Build profiles**:
  - `development` -- development client, internal distribution
  - `preview` -- internal distribution (no development client)
  - `production` -- auto-incrementing build numbers
- **iOS submission**: Apple ID `zzoo.origin@gmail.com`, ASC App ID `6758864658`, Team ID `6VMN7W3K93`
- **Source**: `mobile/eas.json` (lines 1-27)

### Data Stores

#### Neon PostgreSQL (Production)

- **Purpose**: Primary relational database for all application data (users, diary entries, photos metadata, nutrition, ingredients, AI analyses, auth tokens).
- **Engine**: PostgreSQL 18
- **Provider**: Neon (serverless managed PostgreSQL)
- **Connection**: Via `DATABASE_URL` environment variable, injected from GCP Secret Manager (`mealio-database-url`)
- **Connection pool**: Max 10 connections, 3-second acquire timeout (configured in `PgPoolOptions`)
- **Extensions**: `uuid-ossp` (UUID generation), `pg_trgm` (trigram-based fuzzy text search on ingredient names)
- **Migrations**: 9 migration files (`0001` through `0009`), run automatically on API startup via `sqlx::migrate::Migrator`
- **Tables**: `users`, `user_auth_providers`, `user_settings`, `auth_tokens`, `diary_entries`, `entry_locations`, `entry_photos`, `user_nutrition`, `ai_analyses`, `ingredients`, `entry_ingredients`
- **Triggers**: Auto `updated_at` on 6 tables; max 10 photos per entry enforcement; auto-create `user_settings` on user insert
- **Source**: `api/src/main.rs` (lines 77-87), `api/migrations/` (all files)

#### PostgreSQL (Local Development)

- **Purpose**: Local development database matching the production engine.
- **Engine**: `postgres:18-alpine`
- **Port**: 5432
- **Credentials**: user `mealio`, password `mealio`, database `mealio`
- **Provisioning**: Docker Compose (`docker compose up -d`)
- **Source**: `api/.env.example` (line 5), `CLAUDE.md`

#### MMKV (Mobile Local Storage)

- **Purpose**: On-device key-value storage for guest mode data, auth tokens, and user preferences.
- **Library**: `react-native-mmkv` v4.1.2
- **Storage keys**: 12 defined keys covering auth tokens, user data, language, theme, onboarding state, camera permissions, settings categories
- **Usage pattern**: Guest users store diary entries entirely in MMKV; authenticated users use it for token persistence and local settings cache
- **Source**: `mobile/src/shared/config/index.ts` (lines 24-42), `mobile/package.json` (line 58)

### Networking

#### Cloud Run Ingress

- **Purpose**: HTTPS endpoint for the API, managed by GCP Cloud Run's built-in load balancer.
- **Production URL**: `https://mealio-api-1081857794554.us-east4.run.app`
- **API base path**: `/api` (mobile client appends `/v1/` for versioned routes)
- **Health endpoint**: `GET /health` (returns `{"status": "ok", "db": "connected"}` or degraded status)
- **Swagger UI**: Available at `/swagger-ui` (OpenAPI docs at `/api-docs/openapi.json`)
- **Source**: `mobile/src/shared/config/index.ts` (line 17), `api/src/main.rs` (lines 117-120)

#### CORS Configuration

- **Purpose**: Cross-origin request control for the API.
- **Development**: Permissive (allows all origins) when `CORS_ORIGINS` is empty or `*`
- **Production**: Explicit comma-separated origins parsed from `CORS_ORIGINS` environment variable, allowing any methods and any headers
- **Local development default**: `http://localhost:8081`
- **Source**: `api/src/main.rs` (lines 157-174), `api/.env.example` (line 25)

#### Cloudflare R2 Public CDN

- **Purpose**: Public read access for uploaded meal photos.
- **Public URL**: `https://pub-a6ac381f54d7453392feeeac89f6dc8b.r2.dev`
- **Access pattern**: `{R2_PUBLIC_URL}/{object_key}` (e.g., `https://pub-a6ac381f54d7453392feeeac89f6dc8b.r2.dev/photos/123/uuid.jpg`)
- **Source**: `api/service.yaml` (line 68)

### Storage

#### Cloudflare R2 -- `mealio-uploads`

- **Purpose**: S3-compatible object storage for user-uploaded meal photos.
- **Bucket name**: `mealio-uploads`
- **Access method**: Presigned PUT URLs generated server-side (15-minute expiry)
- **Endpoint pattern**: `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
- **Region**: `auto` (Cloudflare-managed)
- **Path style**: Forced (`force_path_style(true)`)
- **Object key pattern**: `photos/{user_id}/{uuid}.{ext}`
- **Allowed content types**: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- **SDK**: `aws-sdk-s3` v1 (S3-compatible client)
- **Credentials**: Injected from GCP Secret Manager (`r2-account-id`, `r2-access-key-id`, `r2-secret-access-key`)
- **Source**: `api/src/features/uploads/handlers.rs` (lines 1-89), `api/src/main.rs` (lines 48-75), `api/service.yaml` (lines 40-68)

### Security

#### GCP Secret Manager

- **Purpose**: Centralized secrets store for all production environment variables.
- **Secrets managed** (7 total):
  | Secret Name | Environment Variable | Purpose |
  |---|---|---|
  | `mealio-database-url` | `DATABASE_URL` | Neon PostgreSQL connection string |
  | `mealio-jwt-secret` | `JWT_SECRET` | HMAC key for JWT signing/verification |
  | `mealio-google-client-id` | `GOOGLE_CLIENT_ID` | Google OAuth audience validation |
  | `r2-account-id` | `R2_ACCOUNT_ID` | Cloudflare R2 account identifier |
  | `r2-access-key-id` | `R2_ACCESS_KEY_ID` | Cloudflare R2 API key ID |
  | `r2-secret-access-key` | `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API secret key |
  | `mealio-api-sentry-dsn` | `SENTRY_DSN` | Sentry ingestion endpoint |
- **Version strategy**: All secrets reference the `latest` version
- **Source**: `api/service.yaml` (lines 24-58)

#### JWT Authentication

- **Purpose**: Stateless access token authentication for API requests.
- **Algorithm**: HS256 (HMAC-SHA256 via `jsonwebtoken` crate)
- **Access token TTL**: 15 minutes (900 seconds)
- **Refresh token TTL**: 30 days
- **Refresh token storage**: Hashed with BLAKE3 and stored in `auth_tokens` table
- **Refresh token rotation**: On every refresh, old token is revoked and new one issued
- **Reuse detection**: If a revoked refresh token is reused, all tokens for that user are revoked (security measure)
- **Claims**: `sub` (user_id), `exp`, `iat`, `jti` (UUID for uniqueness)
- **Extractor**: `AuthUser` Axum extractor parses `Authorization: Bearer {token}` header
- **Source**: `api/src/features/auth/jwt.rs` (lines 1-28), `api/src/features/auth/handlers.rs` (lines 123-179), `api/src/extractors.rs` (lines 45-75)

#### OAuth (Google and Apple)

- **Purpose**: Identity verification for user sign-in.
- **Providers**: Google Sign-In, Apple Authentication
- **Verification method**: JWKS (JSON Web Key Set) verification of ID tokens from providers
- **JWKS URLs**: `https://www.googleapis.com/oauth2/v3/certs` (Google), `https://appleid.apple.com/auth/keys` (Apple)
- **JWKS cache TTL**: 1 hour
- **Algorithm**: RS256 enforced (never trusts `alg` from token header)
- **Google issuers**: `https://accounts.google.com`, `accounts.google.com`
- **Apple issuer**: `https://appleid.apple.com`
- **Google audience**: Validated against `GOOGLE_CLIENT_ID`
- **Apple audience**: Validated against `APPLE_BUNDLE_ID` (`com.zzoo.mealio`)
- **Mobile SDKs**: `@react-native-google-signin/google-signin` v16, `expo-apple-authentication` v55
- **Source**: `api/src/features/auth/oauth.rs` (lines 1-113), `api/src/features/auth/jwks.rs` (lines 1-114)

#### Container Security

- **Purpose**: Minimized attack surface for the API container.
- **Non-root user**: `appuser` (UID 1001) created in Dockerfile
- **Minimal base image**: `debian:trixie-slim` (runtime) with only `ca-certificates` installed
- **Multi-stage build**: Build dependencies (Rust toolchain, OpenSSL dev headers) are not present in the production image
- **Offline SQLx**: `SQLX_OFFLINE=true` during build (no database needed at compile time)
- **Source**: `api/Dockerfile` (lines 1-20)

#### Error Handling

- **Purpose**: Structured error responses following RFC 9457 (Problem Details for HTTP APIs).
- **Content type**: `application/problem+json`
- **Server errors (5xx)**: Automatically reported to Sentry via `sentry::capture_message`
- **Client errors (4xx)**: Not reported to Sentry
- **Auto-conversions**: `sqlx::Error` (database), `jsonwebtoken::errors::Error` (auth), `reqwest::Error` (external services) all convert to appropriate `AppError` variants
- **Source**: `api/src/error.rs` (lines 1-107)

### External Services

#### Sentry -- Error Tracking

- **Purpose**: Real-time error tracking and performance monitoring for both API and mobile.
- **API integration**:
  - SDK: `sentry` v0.38 + `sentry-tower` + `sentry-tracing`
  - Traces sample rate: 20% (`0.2`)
  - Layers: `SentryHttpLayer` (transaction tracking) + `sentry_tracing::layer()` (span/log integration)
  - Secret: `mealio-api-sentry-dsn` from GCP Secret Manager
  - Sentry org/project: Not specified in API code (configured via DSN)
- **Mobile integration**:
  - SDK: `@sentry/react-native` v7.12+
  - Organization: `zzoo-org`
  - Project: `mealio-mobile`
  - Traces sample rate: 100% in dev, 20% in production
  - Enabled: Only in production (`!__DEV__`)
  - PII: Disabled (`sendDefaultPii: false`)
  - Secret: `EXPO_PUBLIC_SENTRY_DSN` environment variable
- **Source**: `api/src/main.rs` (lines 26-34, 126-127), `api/Cargo.toml` (lines 27-29), `mobile/src/shared/lib/sentry.ts` (lines 1-21), `mobile/app.json` (lines 93-98)

#### PostHog -- Analytics

- **Purpose**: Product analytics and user behavior tracking.
- **Status**: Listed in `CLAUDE.md` and `README.md` as the analytics provider, but no PostHog SDK integration was found in the codebase. No `posthog` package in `mobile/package.json` and no PostHog import/reference in mobile source code.
- **Conclusion**: PostHog may be planned but not yet integrated, or it may be integrated via a mechanism outside the current codebase (e.g., a web dashboard only).
- **Source**: `CLAUDE.md`, `README.md` (line 54)

#### Cloudflare Email Routing

- **Purpose**: Email handling for the application domain.
- **Status**: Listed in `CLAUDE.md` and `README.md` as an infrastructure component. No email-sending code was found in the API codebase. This is likely a DNS-level email routing configuration in Cloudflare (forwarding `@mealio` emails to a personal inbox), not an application-level integration.
- **Source**: `CLAUDE.md`, `README.md` (line 52)

#### Google APIs

- **Purpose**: OAuth identity verification and Google Maps for mobile.
- **JWKS endpoint**: `https://www.googleapis.com/oauth2/v3/certs` (fetched by API for token verification)
- **Google Maps**: Used in mobile via `react-native-maps` with `GOOGLE_MAP_API_KEY` for meal location tagging
- **Google Sign-In iOS URL scheme**: `com.googleusercontent.apps.1081857794554-vnv9ri4cstrcjdisma33ca1bu5qn6bnm`
- **Source**: `api/src/features/auth/oauth.rs` (line 7), `mobile/app.json` (lines 71-74, 84-87), `mobile/.env.example` (line 6)

#### Apple ID Services

- **Purpose**: Apple Authentication for iOS sign-in.
- **JWKS endpoint**: `https://appleid.apple.com/auth/keys` (fetched by API for token verification)
- **Team ID**: `6VMN7W3K93`
- **Bundle ID**: `com.zzoo.mealio`
- **SDK**: `expo-apple-authentication` v55
- **Source**: `api/src/features/auth/oauth.rs` (lines 9-10), `api/service.yaml` (lines 61-64), `mobile/package.json` (line 28)

## Relationships

### Request Flow: Mobile to API

```
Mobile App --> HTTPS --> Cloud Run (mealio-api) --> Neon PostgreSQL
                                                 --> Cloudflare R2 (presigned URLs)
                                                 --> Google JWKS (token verification)
                                                 --> Apple JWKS (token verification)
```

### Photo Upload Flow

```
Mobile App --> API: POST /api/v1/uploads/presign (gets presigned URL + public URL)
Mobile App --> R2: PUT {presigned_url} (direct upload, bypasses API)
Mobile App --> API: POST /api/v1/diary/{id}/photos (stores public URL reference in database)
```

### Authentication Flow

```
Mobile App --> Google/Apple SDK (gets ID token on device)
Mobile App --> API: POST /api/v1/auth/sign-in {provider, id_token}
API --> Google/Apple JWKS (verifies ID token via cached public keys)
API --> Neon: Find or create user + auth provider record
API --> Mobile App: {access_token, refresh_token, user_info}
```

### Token Refresh Flow

```
Mobile App --> API: POST /api/v1/auth/refresh {refresh_token}
API --> Neon: Validate token hash, revoke old, issue new
API --> Mobile App: {access_token, refresh_token}
```

### Error Reporting Flow

```
API (5xx errors) --> Sentry (server-side, via sentry-tower middleware)
Mobile App (crashes/errors) --> Sentry (client-side, via @sentry/react-native)
```

### Component Dependency Map

| Component | Depends On | Depended On By |
|---|---|---|
| Cloud Run (mealio-api) | Neon PostgreSQL, Cloudflare R2, GCP Secret Manager, Google JWKS, Apple JWKS, Sentry | Mobile App |
| Neon PostgreSQL | -- | Cloud Run (mealio-api) |
| Cloudflare R2 | -- | Cloud Run (presign), Mobile App (direct upload/read) |
| GCP Secret Manager | -- | Cloud Run (env injection) |
| GCP Artifact Registry | -- | Cloud Run (image pull) |
| Sentry | -- | Cloud Run (API errors), Mobile App (client errors) |
| EAS | -- | App Store, Play Store |
| Mobile App | Cloud Run (API), Cloudflare R2 (photos), Google/Apple SDK, Sentry, EAS (builds) | End users |
| Google JWKS | -- | Cloud Run (OAuth verification) |
| Apple JWKS | -- | Cloud Run (OAuth verification) |

## Environment Differences

### Development vs Production

| Aspect | Development | Production |
|---|---|---|
| **API host** | `localhost:3000` | `mealio-api-1081857794554.us-east4.run.app` |
| **API base URL** | `http://localhost:3000/api` | `https://mealio-api-1081857794554.us-east4.run.app/api` |
| **Database** | Docker `postgres:18-alpine` on localhost:5432 | Neon managed PostgreSQL |
| **Database credentials** | `mealio:mealio@localhost:5432/mealio` | Neon connection string via Secret Manager |
| **Secrets management** | `.env` file (via `dotenvy`) | GCP Secret Manager (injected as env vars) |
| **CORS** | Permissive (all origins allowed) | Explicit origin allowlist via `CORS_ORIGINS` |
| **CORS default** | `http://localhost:8081` | Configured per deployment |
| **Container** | Not used (`cargo run` directly) | Multi-stage Docker build on Cloud Run |
| **Autoscaling** | N/A (single process) | 0-3 instances |
| **Sentry (API)** | Initialized but likely no DSN set | Active with 20% trace sampling |
| **Sentry (Mobile)** | Disabled (`enabled: !__DEV__`) | Enabled with 20% trace sampling |
| **Analytics** | Disabled (`FEATURE_FLAGS.ANALYTICS = !__DEV__`) | Enabled |
| **Crash reporting** | Disabled (`FEATURE_FLAGS.CRASH_REPORTING = !__DEV__`) | Enabled |
| **R2 storage** | Requires valid R2 credentials in `.env` | Credentials from Secret Manager |
| **Mobile builds** | Local via `bun run ios` / `bun run android` | EAS Build (cloud) |
| **Mobile distribution** | Simulator/emulator or dev client | App Store (iOS), Play Store (Android) |

### EAS Build Profiles

| Profile | Development Client | Distribution | Auto-increment |
|---|---|---|---|
| `development` | Yes | Internal | No |
| `preview` | No | Internal | No |
| `production` | No | Store | Yes |

## Deployment Process

No CI/CD pipeline configuration files (GitHub Actions, GitLab CI, etc.) were found in the repository. Based on the IaC files present, the deployment process appears to be manual:

1. **API deployment**: Build Docker image locally or in a CI environment, push to `us-east4-docker.pkg.dev/mealio-483914/services/api:latest`, then deploy the Cloud Run service using `service.yaml`.
2. **Mobile deployment**: Run `eas build --profile production` followed by `eas submit` to push to app stores.
3. **Database migrations**: Run automatically on API startup (no manual migration step required).

## Unverified Items

| Item | Claim Source | Status | Reasoning |
|---|---|---|---|
| **PostHog analytics** | `CLAUDE.md`, `README.md` | **Not found in code** | No PostHog SDK in `package.json`, no imports or references in mobile source code. May be planned but not yet integrated. |
| **Cloudflare Email Routing** | `CLAUDE.md`, `README.md` | **Not found in code** | No email-sending code in the API. Likely a DNS-level Cloudflare configuration for forwarding domain emails, not an application integration. |
| **GCP Queue (Cloud Run)** | `CLAUDE.md` | **Not found in code** | `CLAUDE.md` lists "Queue: GCP Cloud Run" but no queue/worker service configuration, task queue code, or Cloud Tasks integration was found. May be planned infrastructure. |
| **CI/CD pipeline** | -- | **Not found** | No `.github/workflows/`, `cloudbuild.yaml`, or similar CI/CD configuration files found in the repository root. Deployment appears to be manual. |
| **Custom domain** | -- | **Unknown** | The production URL uses the default Cloud Run domain (`*.run.app`). It is unknown whether a custom domain is configured at the Cloud Run or DNS level. |
| **R2 bucket access control** | -- | **Unknown** | The public URL pattern (`pub-*.r2.dev`) suggests the bucket has public read access enabled, but the exact Cloudflare R2 bucket configuration (CORS rules, lifecycle policies, access control) is not defined in IaC files. |
| **Neon configuration** | -- | **Unknown** | The specific Neon project settings (region, compute size, autoscaling, branching strategy, connection pooler) are not defined in the repository. |
| **Google Maps API restrictions** | -- | **Unknown** | The `GOOGLE_MAP_API_KEY` is referenced but its API key restrictions (referrer, API, quota) are configured in the Google Cloud Console, not in code. |

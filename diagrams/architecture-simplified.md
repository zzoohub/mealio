# Architecture Overview (Simplified)

## System Summary
Mealio is a photo-first meal tracking mobile application where users capture meal photos, log nutritional information, and view aggregated statistics. The system supports both authenticated (cloud-backed) and guest (local-only) modes.

## Major Components

### Mobile App (React Native/Expo)
**Purpose**: Cross-platform iOS/Android app providing meal capture, diary management, and statistics visualization.
**Contains**:
- Photo capture and upload pipeline (Expo Camera/Image Picker)
- Dual-mode state management (Zustand + TanStack Query for auth, MMKV for guest)
- OAuth authentication (Google/Apple Sign-In)
- Feature-sliced design architecture (widgets, features, entities, shared)
- i18n support (English/Korean)

### API Server (Rust/Axum)
**Purpose**: RESTful JSON API handling all authenticated operations, serving as the central business logic layer.
**Contains**:
- 10 feature modules (auth, diary, photos, nutrition, ingredients, statistics, AI analysis, users, settings, uploads)
- JWT authentication with refresh token rotation and reuse detection
- OAuth verification via Google/Apple JWKS endpoints
- Presigned URL generation for R2 uploads
- RFC 9457 error handling
- OpenAPI/Swagger documentation

### Database (PostgreSQL/Neon)
**Purpose**: Persistent storage of all user data with relational integrity and soft-delete support.
**Contains**:
- 9 SQL migrations creating 11 tables
- Soft-delete for users and diary entries
- Auto-created user settings via DB trigger
- Trigram fuzzy search for ingredients (pg_trgm extension)
- Photo limit enforcement (max 10 per entry via trigger)
- Timezone-aware date filtering

### Object Storage (Cloudflare R2)
**Purpose**: Scalable storage for user-uploaded meal photos via S3-compatible API.
**Contains**:
- S3-compatible bucket (mealio-uploads)
- Direct client-to-R2 upload via presigned PUT URLs (15-min expiry)
- Public CDN for photo serving (pub-a6ac381f54d7453392feeeac89f6dc8b.r2.dev)
- Object key pattern: photos/{user_id}/{uuid}.{ext}

### External Identity Providers (Google/Apple OAuth)
**Purpose**: Third-party authentication via OAuth 2.0 ID tokens verified through JWKS.
**Contains**:
- Google JWKS endpoint (www.googleapis.com/oauth2/v3/certs)
- Apple JWKS endpoint (appleid.apple.com/auth/keys)
- RS256 signature verification
- Claims validation (audience, issuer, expiration)

### Observability (Sentry)
**Purpose**: Error tracking and performance monitoring across API and mobile clients.
**Contains**:
- Rust SDK 0.38 with tower/tracing integration (API)
- React Native SDK 7.x (Mobile)
- Transaction sampling (20% sample rate)
- Automatic error capture for 5xx responses

## Data Flow

1. **Guest Mode (Local-Only)**
   - User captures photo → stored temporarily in-memory
   - User creates entry → saved to MMKV local storage (max 10 entries)
   - No network requests, fully offline functional

2. **Authenticated Mode (Cloud-Backed)**
   - User signs in via Google/Apple → ID token sent to API
   - API verifies token via JWKS → creates/restores user in PostgreSQL → returns JWT access token (15 min) + refresh token (30 days)
   - Tokens stored in SecureStore (encrypted keychain), expiry in MMKV
   - Mobile requests presigned URL from API → API generates S3 presigned PUT URL for R2
   - Mobile uploads photo directly to R2 (no API proxy)
   - Mobile creates diary entry via API → stored in PostgreSQL with primary photo URL
   - Mobile fetches diary feed → API queries PostgreSQL with timezone-aware filtering → results cached by TanStack Query

3. **Token Refresh Flow**
   - Access token expires (15 min lifetime)
   - Mobile sends refresh token → API validates, rotates tokens (revoke old, issue new) → returns new access + refresh tokens
   - If revoked token is reused, all user tokens are revoked (family revocation for security)

4. **Migration Flow (Guest → Authenticated)**
   - User signs in while having local guest entries
   - Mobile sequentially uploads each entry: presign URL → upload to R2 → create entry → attach photo
   - Local entries remain until migration completes successfully

## Key Interactions

| From | To | What |
|------|-----|------|
| Users (iOS/Android) | Mobile App | Meal photos, diary entries, settings |
| Mobile App | Google/Apple OAuth | ID token requests for sign-in |
| Mobile App | API Server | All authenticated CRUD operations (diary, photos, nutrition, statistics) |
| Mobile App | Cloudflare R2 | Direct photo uploads via presigned URLs |
| API Server | Google/Apple JWKS | Token verification (RS256 signature check) |
| API Server | Neon PostgreSQL | All data persistence (users, entries, photos, nutrition, ingredients, statistics) |
| API Server | Cloudflare R2 | Presigned URL generation (via S3 SDK) |
| API Server | Sentry | Error tracking and performance traces |
| Mobile App | Sentry | Client-side error tracking |
| GCP Secret Manager | API Server | Secrets injection at runtime (DATABASE_URL, JWT_SECRET, R2 credentials, SENTRY_DSN) |

## Deployment

- **API Server**: GCP Cloud Run (Knative Service, us-east4, 0-3 instances, scale-to-zero enabled)
  - Container: `us-east4-docker.pkg.dev/mealio-483914/services/api:latest`
  - Resources: 1 CPU, 512Mi memory, 80 concurrent requests/container
  - Health checks: startup probe (4s interval), liveness probe (15s interval)

- **Database**: Neon (serverless PostgreSQL, 10-connection pool)

- **Mobile**: Expo 55 with Hermes V1 engine, bundle ID `com.zzoo.mealio`

- **Object Storage**: Cloudflare R2 bucket accessed via S3-compatible API

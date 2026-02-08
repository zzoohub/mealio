# Infrastructure Overview (Simplified)

## System Summary
Mealio runs as a containerized Rust API on Google Cloud Platform (GCP Cloud Run), backed by a managed PostgreSQL database (Neon) and Cloudflare object storage (R2). The React Native mobile app is built on Expo Application Services and distributed through the iOS App Store and Android Play Store.

## Major Components

### API Service (GCP Cloud Run)
**Purpose**: Hosts the Rust/Axum backend serving all REST endpoints under `/api/v1/`
**Contains**: Containerized application server (0-3 instances, auto-scaling), health checks, HTTPS ingress, CORS configuration
**Technology**: Docker container (`rust:1.92-slim`), region `us-east4`, 1 CPU / 512Mi RAM per instance

### Database (Neon PostgreSQL)
**Purpose**: Primary relational data store for all application data
**Contains**: Users, diary entries, photos metadata, nutrition data, ingredients, AI analyses, OAuth tokens
**Technology**: Managed PostgreSQL 18 with automatic migrations on API startup

### Object Storage (Cloudflare R2)
**Purpose**: S3-compatible storage for user-uploaded meal photos
**Contains**: Photo objects organized by user ID, presigned upload URLs (15-min expiry), public CDN access
**Technology**: Cloudflare R2 bucket `mealio-uploads` with public read endpoint

### Mobile App (Expo + React Native)
**Purpose**: Native iOS/Android client for meal tracking
**Contains**: User interface, camera integration, offline guest mode (MMKV storage), Google Maps location tagging
**Technology**: React Native 0.83, Expo 55, built via Expo Application Services, distributed via App Store and Play Store

### Authentication (OAuth + JWT)
**Purpose**: User identity verification and session management
**Contains**: Google Sign-In, Apple Authentication, JWT access tokens (15-min TTL), refresh tokens (30-day TTL, stored hashed)
**Technology**: JWKS verification (RS256), HMAC-SHA256 JWT signing, token rotation and reuse detection

### Secrets Management (GCP Secret Manager)
**Purpose**: Centralized storage for production credentials and API keys
**Contains**: Database connection string, JWT secret, OAuth client IDs, R2 credentials, Sentry DSN
**Technology**: GCP Secret Manager with environment variable injection to Cloud Run

### Error Tracking (Sentry)
**Purpose**: Real-time error monitoring and performance tracing for API and mobile
**Contains**: Server-side error capture (5xx only), client-side crash reporting, transaction traces (20% sample rate)
**Technology**: `sentry-tower` middleware (API), `@sentry/react-native` SDK (mobile)

## Data Flow

1. **External request hits** the mobile app (iOS/Android)
2. **User authenticates** via Google/Apple OAuth → API verifies token via JWKS → returns JWT access/refresh tokens
3. **App requests route to** GCP Cloud Run API over HTTPS
4. **API accesses** Neon PostgreSQL for data reads/writes
5. **Photo uploads** use presigned R2 URLs (mobile uploads directly to R2, bypassing API)
6. **Errors are reported** to Sentry from both API (server-side) and mobile (client-side)

## Key Boundaries

| Boundary | Inside | Outside |
|----------|--------|---------|
| **Application** | GCP Cloud Run API, Neon database, mobile app | Cloudflare R2 (direct client access via presigned URLs) |
| **Authentication** | API (JWT issuance/verification), GCP Secret Manager (JWT secret) | Google/Apple OAuth providers (JWKS endpoints) |
| **Data Storage** | Neon PostgreSQL (metadata), Cloudflare R2 (photo blobs), MMKV (guest mode local storage) | N/A |
| **External Services** | Sentry (error tracking), Google Maps API (mobile location), Expo Application Services (mobile builds) | N/A |
| **Regions** | GCP us-east4 (API), Cloudflare auto (R2) | Neon (region unspecified in code) |

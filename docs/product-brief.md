# Mealio — Product Brief

## 1. Product Overview

**Mealio** is a photo-first meal tracking mobile app. Users capture meal photos to instantly create entries, then optionally enrich them with nutrition data, ingredients, location, and notes. The app supports guest mode for frictionless onboarding and authenticated mode for unlimited cloud-synced records.

- **Platforms**: iOS / Android (React Native + Expo)
- **Languages**: English, Korean
- **Status**: Production (App Store / Play Store via EAS Build + OTA updates)

## 2. Problem Statement

### The Problem

Meal tracking is fundamental to health management, but existing apps suffer from:

1. **High friction recording** — Users must search food databases, input portions, and verify nutrition data before saving
2. **Number-centric UX** — Charts and tables dominate, losing the visual context of what was actually eaten
3. **Signup walls** — No way to try the app without creating an account, breaking first-time user experience

### Mealio's Approach

- **Photo-first**: Tap the camera, take a photo, and the entry is created
- **Progressive detail**: A photo alone completes a record; nutrition, ingredients, and notes are optional additions
- **Guest mode**: Start immediately without signup (up to 10 entries), then login to migrate data seamlessly

## 3. Target Users

### Primary: Health-Conscious 20-30s

- Want to improve eating habits but find existing diary apps too complex
- Comfortable with photo-based daily logging (Instagram-style)
- Bilingual Korean/English users

### Secondary: Diet & Nutrition Trackers

- Actively tracking calories and macronutrients
- Need ingredient frequency analysis to identify eating patterns

## 4. Core Value Proposition

| Value | Description |
|-------|-------------|
| **Instant start** | Guest mode: no signup, photo capture creates a record immediately |
| **Photo-centric experience** | Camera view is the home screen; capture triggers entry creation |
| **Flexible detail** | Meal type, nutrition, ingredients, location, notes — all optional enrichment |
| **Eating pattern insights** | Nutrition averages/totals, meal type distribution, top 20 ingredients |
| **Offline resilience** | Record without network; auto-sync when connected |

## 5. Key Features (Currently Implemented)

### 5.1 Authentication & Guest Mode

- **OAuth login**: Google Sign-In, Apple Sign-In
- **Guest mode**: Up to 10 entries stored locally in MMKV without signup
- **Data migration**: Guest entries automatically uploaded to server upon login
- **Token management**: JWT access/refresh tokens with pre-emptive refresh 30s before expiry

### 5.2 Meal Capture & Entry Creation

- **Camera view**: Expo Camera with flash/torch controls, photo capture
- **Meal type selection**: Breakfast, lunch, dinner, snack, dessert, drink, other
- **Photo management**: Up to 10 photos per entry, primary photo designation, sort order
- **Presigned upload**: Client uploads directly to Cloudflare R2 (jpeg, png, webp, heic)

### 5.3 Entry Detail & Editing

- **Nutrition input**: Calories, protein, fat, carbs, fiber, sugar, sodium — all optional, NUMERIC(8,2)
- **Ingredient management**: Fuzzy search from master ingredient list (trigram matching), amount/unit recording
- **Location**: Latitude/longitude + place name/address
- **Notes & rating**: Free-text notes, 0-5 star rating, "would eat again" toggle

### 5.4 Diary Feed

- **Month/week navigation**: Calendar/timeline view for browsing entries
- **Search & filter**: Date range, meal type, text search (notes, location, ingredients), "would eat again" filter
- **Sorting**: By eaten time (asc/desc), by rating (desc)
- **Photo grid**: 3-4 column FlashList-based virtualized rendering
- **Recent entries carousel**: Horizontal scroll of last 6 entries on home screen

### 5.5 Statistics & Insights

- **Nutrition statistics**: Period-based averages/totals for all macro nutrients
- **Meal type distribution**: Breakfast/lunch/dinner/snack frequency counts
- **Top 20 ingredients**: Ranked by usage frequency
- **Combined overview**: All three stats in a single dashboard endpoint

### 5.6 Settings

- **Theme**: Light / Dark / System auto
- **Language**: Korean / English switching
- **Nutrition targets**: Daily calorie and macro goals
- **Account management**: Profile editing, logout, account deletion (soft delete)

### 5.7 Background Upload Queue

- Entry saved → queued (Zustand) → photos uploaded to R2 in parallel → server entry created → photos linked → AI analysis triggered
- Sequential processing (one at a time), retry on failure
- Single mount point: `<UploadProcessorMount />` in AppProvider
- Cache invalidation on completion: `diary.all()` + `statistics.all()`

## 6. AI Meal Analysis (Trigger-and-Poll)

- **Flow**: Entry created with photos → API triggers background AI analysis → client polls for results
- **Architecture**: `POST /diary/{id}/analyze` returns 202 immediately, `tokio::spawn` processes AI Vision API call in background
- **DB schema**: `ai_analyses` table with status (processing/completed/failed), calories, nutrients, description, confidence_score, raw_response (JSONB)
- **Client UX**: Entry detail shows spinner while processing, nutrition results when completed, retry button on failure
- **Reliability**: Server startup recovers stuck analyses (>5 min processing), idempotent trigger prevents duplicates
- **Scope**: Auth-only (guest mode excluded), requires at least one photo per entry

## 7. Technical Highlights

| Area | Technology |
|------|-----------|
| **Mobile** | React Native 0.83 + Expo 55, TypeScript, Feature-Sliced Design |
| **State Management** | Zustand (client) + TanStack Query (server) + MMKV (persistence) |
| **API** | Rust / Axum 0.8 + SQLx (compile-time query verification) |
| **Database** | Neon PostgreSQL 18 (trigram search, soft deletes) |
| **Object Storage** | Cloudflare R2 (presigned URL direct upload) |
| **Infrastructure** | GCP Cloud Run (0-3 auto-scaling) + Pulumi IaC |
| **CI/CD** | GitHub Actions (build/test/deploy) + EAS Build/OTA |
| **Error Tracking** | Sentry (API 5xx auto-report, mobile crash tracking) |
| **Auth** | OAuth 2.0 (Google, Apple) + JWT + JWKS caching |

## 8. Competitive Differentiation

| Factor | Existing Apps (MyFitnessPal, etc.) | Mealio |
|--------|-----------------------------------|--------|
| Entry creation | Search food → input portions | Single tap photo capture |
| First use | Signup required | Guest mode, instant start |
| Visual experience | Number/chart focused | Photo grid focused |
| Detail input | Mandatory fields | All optional enrichment |
| Offline | Not supported | Local storage + auto-sync |
| Multilingual | English-centric | Native Korean + English |

## 9. Success Metrics (Future)

- **DAU/MAU**: Daily/monthly active user ratio
- **Recording frequency**: Average entries per user per day
- **Guest-to-auth conversion**: Signup rate from guest mode
- **Retention**: D1, D7, D30 retention rates
- **Upload success rate**: Background upload queue success/failure ratio

## 10. Future Roadmap

1. ~~**AI meal analysis**: Photo-based automatic nutrition estimation~~ → **In Progress** (trigger-and-poll architecture)
2. **Social features**: Meal sharing, friend feeds
3. **Notifications**: Meal recording reminders
4. **Widgets**: iOS/Android home screen widgets
5. **Data export**: CSV/PDF reports

# Mealio -- Product Requirements Document

**Version:** 1.0
**Last Updated:** 2026-02-03
**Author:** Product Team
**Status:** Living Document

---

## Table of Contents

1. [Product Overview and Vision](#1-product-overview-and-vision)
2. [Target Users and Personas](#2-target-users-and-personas)
3. [Problem Statement](#3-problem-statement)
4. [Core Features](#4-core-features)
5. [User Flows](#5-user-flows)
6. [Technical Architecture Summary](#6-technical-architecture-summary)
7. [Data Model Overview](#7-data-model-overview)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Current Status and Roadmap](#9-current-status-and-roadmap)
10. [Success Metrics and KPIs](#10-success-metrics-and-kpis)
11. [Constraints and Dependencies](#11-constraints-and-dependencies)

---

## 1. Product Overview and Vision

### 1.1 Product Summary

Mealio is a mobile-first meal tracking application that enables users to photograph their meals, receive AI-powered nutritional analysis, and maintain a visual food diary over time. The product consists of a React Native/Expo mobile client and a Rust/Axum backend API, deployed on Cloudflare infrastructure.

### 1.2 Vision Statement

To make nutritional awareness effortless by replacing manual food logging with intelligent, photo-based meal tracking that adapts to each user's dietary patterns.

### 1.3 Product Principles

- **Camera-first interaction.** The primary entry point is photographing a meal, not filling out forms. Reduce friction to the absolute minimum number of taps between opening the app and capturing a meal.
- **AI-assisted, human-controlled.** AI provides nutrition estimates and ingredient detection, but users always retain the ability to override and correct values. The system treats user overrides as the source of truth.
- **Personal and private.** Mealio is a personal health tool. Data belongs to the user. Social features are not a core priority in the initial release.
- **Bilingual by default.** English and Korean are first-class supported languages across the entire interface.

### 1.4 Key Differentiators

| Differentiator | Description |
|---|---|
| Photo-first capture | Camera is the primary home screen action; logging a meal starts with a photo, not a form |
| AI nutrition analysis | Automatic food recognition, ingredient detection, and macro estimation from photos |
| Manual override system | Users can correct any AI-estimated value; overrides take permanent priority in all statistics |
| Visual diary timeline | Week-based calendar navigation with meal photo cards instead of spreadsheet-style logs |
| Bilingual support | Full English and Korean localization from day one |

---

## 2. Target Users and Personas

### 2.1 Primary Persona: Health-Conscious Professional

**Name:** Min-ji (30, Product Designer, Seoul)

- Wants to understand her eating patterns without tedious manual logging
- Eats a mix of Korean and Western food; needs flexible meal categorization
- Values aesthetics: wants a diary that looks good, not a spreadsheet
- Uses iPhone, expects polished native experience
- Bilingual (Korean primary, English secondary)

**Goals:**
- Track meals quickly during a busy workday (under 15 seconds per entry)
- Get approximate calorie and macro breakdowns without memorizing nutrition databases
- Review weekly eating patterns to make gradual improvements

**Frustrations with alternatives:**
- Manual calorie counting apps require too many taps and searching through food databases
- Generic fitness apps do not handle Korean foods well
- Photo-only apps without nutritional data are just glorified camera rolls

### 2.2 Secondary Persona: Fitness Enthusiast

**Name:** James (26, Personal Trainer, Los Angeles)

- Tracks macros meticulously for body composition goals
- Wants AI estimates as a starting point but needs to correct values based on his knowledge
- Logs 4-6 meals per day including snacks and supplements
- Cares about protein and fiber tracking specifically

**Goals:**
- Log high volumes of meals efficiently
- Override AI estimates with accurate values when he knows the exact macros
- View weekly and monthly nutrition trends

### 2.3 Tertiary Persona: Casual Health Explorer

**Name:** Soo-yeon (45, Office Manager, Busan)

- New to nutritional awareness; does not know macro counts
- Wants a simple way to see "am I eating okay?"
- Motivated by visual progress, not numbers
- Prefers Korean language interface

**Goals:**
- Take photos of meals as a visual food diary
- Get simple, understandable AI feedback on meals
- See meal type distribution over time (too many snacks? not enough vegetables?)

---

## 3. Problem Statement

### 3.1 The Core Problem

People who want to understand and improve their eating habits face a choice between two unsatisfying options:

1. **Manual food logging apps** -- accurate but high-friction. Requires searching food databases, estimating portions, and entering data for every meal. Most users abandon these within two weeks.
2. **No tracking at all** -- zero effort but zero insight. Without any record, users cannot identify patterns or make informed changes.

### 3.2 The Opportunity

Smartphone cameras and modern AI models have reached a point where automatic food recognition and nutritional estimation are viable for everyday use. A photo-first approach can reduce meal logging time from 2-3 minutes to under 15 seconds, dramatically improving retention.

### 3.3 The Hypothesis

If we provide a meal tracking experience where the primary interaction is taking a photo and the system handles nutritional estimation automatically, users will:
- Log meals at least 3x more consistently than with manual entry apps
- Develop awareness of their dietary patterns within the first two weeks
- Return to the app daily for at least 30 days

---

## 4. Core Features

### 4.1 Authentication

**Implementation Status: COMPLETE (API + Mobile)**

Users authenticate through third-party OAuth providers. No email/password registration.

| Capability | Detail |
|---|---|
| Sign-in providers | Google OAuth, Apple Sign-In |
| Token system | JWT access tokens (short-lived) + opaque refresh tokens (30-day expiry) |
| Token rotation | Refresh tokens are single-use with automatic rotation on each refresh |
| Reuse detection | If a previously-used refresh token is presented, all tokens for that user are revoked (security measure against token theft) |
| Device tracking | Device info string (OS/version) stored per refresh token |
| Account deletion | Soft-delete: revokes all tokens, sets `deleted_at` timestamp, excludes from all queries |

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/sign-in` | Exchange OAuth id_token for access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Rotate refresh token, issue new access token |
| POST | `/api/v1/auth/revoke` | Revoke a specific refresh token (requires auth) |

**Mobile Implementation:**
- `authStore` (Zustand) manages user state, login/logout flows
- `tokenStore` manages JWT storage via MMKV with expiry tracking
- `apiClient` handles automatic token refresh with mutex to prevent concurrent refresh races
- Pre-emptive refresh: if the access token is expired before a request, refresh happens automatically
- 401 retry: if a request fails with 401, one automatic retry occurs after refreshing

### 4.2 Meal Capture (Camera)

**Implementation Status: COMPLETE (Mobile), PARTIAL (API -- photo metadata storage works, but R2 upload flow not wired)**

The camera is the primary interaction surface. Users capture one or more photos of their meal.

| Capability | Detail |
|---|---|
| Camera interface | Full-screen camera view using `expo-camera` CameraView |
| Flash control | Three modes: off, on, auto (cycles on tap) |
| Multi-photo capture | Up to 10 photos per entry (enforced client-side and by database trigger) |
| Photo strip | Horizontal strip preview of captured photos below camera viewfinder |
| Photo removal | Swipe or tap to remove individual captured photos before saving |
| Gallery access | Pick existing photos from device gallery via `expo-image-picker` (multi-select, respects remaining photo limit) |
| Haptic feedback | Medium impact on capture, success notification on completion, warning on limit reached, error on failure |
| Capture animation | Reanimated shared value drives button scale animation (press/release/bounce) |
| Photo quality | 0.8 quality setting for JPEG compression (balance of quality and size) |

**Mobile Components:**
- `Camera.tsx` -- Full camera view
- `CameraTopControls.tsx` -- Flash toggle, settings
- `CameraBottomControls.tsx` -- Capture button, gallery picker, photo counter
- `CaptureButton.tsx` -- Animated capture button with press states
- `PhotoStrip.tsx` -- Horizontal preview of captured photos
- `CameraPermissionScreen.tsx` -- Permission request flow
- `useCamera` hook -- All camera logic (state, capture, gallery, flash)
- `useEntryForm` hook -- Form state for creating a diary entry from captured photos

### 4.3 Diary Feed

**Implementation Status: COMPLETE (API + Mobile)**

The diary feed is the main chronological view of meal entries.

| Capability | Detail |
|---|---|
| Week-based navigation | Horizontal day selector showing current week's dates |
| Calendar modal | Full calendar view for jumping to any date |
| Entry cards | Photo thumbnail, meal type badge, title, nutrition summary |
| Date filtering | Entries filtered by selected date |
| Meal type filtering | Filter by breakfast, lunch, dinner, snack, dessert, drink, other |
| Full-text search | ILIKE search on entry titles |
| Pagination | Server-side pagination (default 20 per page, max 100) |
| FAB capture button | Floating action button for quick access to camera |
| Empty state | Handled when no entries exist for selected date |
| Offline storage | MMKV-based entry storage for offline access with migration support |

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/diary` | List entries (paginated, filterable by date range, meal type, search query) |
| POST | `/api/v1/diary` | Create new entry (with optional inline location) |
| GET | `/api/v1/diary/{id}` | Get entry detail (includes location, photos, nutrition) |
| PATCH | `/api/v1/diary/{id}` | Update entry fields |
| DELETE | `/api/v1/diary/{id}` | Soft-delete entry |

**Query Parameters for List:**
- `page`, `per_page` -- Pagination (1-indexed, default 20)
- `start_date`, `end_date` -- Date range filter
- `meal_type` -- Enum filter
- `q` -- Title search (ILIKE)

### 4.4 Search and Filter

**Implementation Status: COMPLETE (Mobile UI components built, API filtering integrated)**

Advanced search and filtering for finding past entries.

| Capability | Detail |
|---|---|
| Text search | Search by entry title |
| Meal type filter chips | Visual toggle chips for each meal type |
| Date quick filters | Presets: today, this week, this month, custom range |
| Custom date range | Modal date range picker |
| Sort options | By date (asc/desc), calories, protein, health score, nutrition density |
| Grid layout | Photo-centric grid display of search results |
| Active filter display | Visual badges showing active filters with remove buttons |
| Pagination | Scroll-based pagination for search results |

**Mobile Components:**
- `MealTypeFilterChips.tsx` -- Meal type toggle buttons
- `DateQuickFilters.tsx` -- Date preset buttons
- `EntryDateRangeModal.tsx` -- Custom date range picker
- `EntrySortModal.tsx` -- Sort option selector
- `SearchGridItem.tsx` -- Grid entry card for search results
- `ActiveFilters.tsx` -- Active filter badges with removal
- `useEntrySearch` hook -- Search state and API integration
- `useDiarySearchPage` hook -- Page-level search coordination
- `useEntrySorting` hook -- Sort state management

### 4.5 Entry Detail

**Implementation Status: COMPLETE (Mobile UI), API detail endpoint returns aggregated data**

Detailed view of a single diary entry with all associated data and editing capabilities.

| Capability | Detail |
|---|---|
| Hero image | Large primary photo display |
| Context bar | Meal type badge, timestamp, location (if present) |
| AI comment banner | AI-generated witty one-liner about the meal |
| Notes section | Editable free-text notes |
| Star rating | 1-5 star rating (client-side entity field) |
| Would-eat-again toggle | Boolean preference toggle (client-side entity field) |
| Ingredient list | AI-detected ingredients displayed as list |
| Nutrition breakdown | Calorie, protein, fat, carbs, fiber, sugar, sodium display |
| Nutrition override | User can manually set nutrition values (overrides AI estimates) |
| Delete entry | Destructive action with confirmation dialog |

**Mobile Components:**
- `MealHeroImage.tsx` -- Full-width hero image display
- `EntryDetailHeader.tsx` -- Navigation and title
- `EntryContextBar.tsx` -- Meal type, time, location badges
- `AICommentBanner.tsx` -- AI analysis comment display
- `AIAnalysisSection.tsx` -- Detailed AI analysis display
- `EntryNotesSection.tsx` -- Editable notes
- `MealNutritionRow.tsx` -- Individual nutrition metric row
- `EntryDeleteButton.tsx` -- Delete with confirmation
- `useEntryDetail` hook -- Entry loading, updates, deletion

**Note:** The `rating` and `wouldEatAgain` fields exist in the mobile Entry type but are not yet persisted to the API. They are stored locally only.

### 4.6 AI Meal Analysis

**Implementation Status: STUBBED — DEFERRED TO POST-MVP**

> API endpoints exist but return 501 Not Implemented. The interface (models, types, DB schema) is preserved for future implementation.

AI-powered analysis of meal photos to detect foods, estimate nutrition, and provide insights.

| Capability | Detail |
|---|---|
| Nutrition estimation | Calories, protein, fat, carbs, fiber, sugar, sodium |
| Food description | Text description of detected meal |
| Confidence score | 0.00 to 1.00 confidence in analysis accuracy |
| Raw response storage | Full AI model response stored as JSONB for debugging and reprocessing |
| Multiple analyses | Multiple analyses can exist per entry (latest is used); allows re-analysis |

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/diary/{entry_id}/analysis` | Get latest AI analysis for entry |
| POST | `/api/v1/diary/{entry_id}/analysis` | Create new AI analysis for entry |

**Mobile Entity Model (Planned Full Integration):**
```
AIAnalysis {
  detectedMeals: string[]
  confidence: number
  nutrition: NutritionInfo
  mealCategory: MealType
  ingredients: string[]
  cuisineType?: string
  comment?: string          // AI-generated witty one-liner
  insights?: {
    healthScore: number
    nutritionBalance: string
    recommendations: string[]
    warnings?: string[]
  }
}
```

**Current Status:** The AI analysis data model, API endpoints, and mobile type definitions are preserved for future implementation. Endpoints currently return 501 Not Implemented. The full AI pipeline — sending photos to a vision model, parsing results, and creating analysis records — is deferred to post-MVP. When implemented, the existing interface will be used without schema changes.

### 4.7 Nutrition Tracking

**Implementation Status: COMPLETE (API), Mobile displays but override UI is partial**

Per-entry nutritional data with user override capability.

| Capability | Detail |
|---|---|
| Primary nutrients | Calories, protein (g), fat (g), carbs (g) -- always displayed in UI |
| Secondary nutrients | Fiber (g), sugar (g), sodium (mg) -- aggregated in stats, shown in UI when data exists |
| Precision | NUMERIC(8,2) -- up to 999,999.99 |
| Validation | All values must be >= 0 (database CHECK constraints) |
| User overrides | User nutrition record is the source of truth for all computations |
| Priority logic | Statistics queries use `user_nutrition` directly. AI fallback via `COALESCE(user_nutrition, ai_analysis)` will be re-added when AI analysis is implemented |

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/diary/{entry_id}/nutrition` | Get user nutrition override for entry |
| PUT | `/api/v1/diary/{entry_id}/nutrition` | Upsert user nutrition override |
| DELETE | `/api/v1/diary/{entry_id}/nutrition` | Delete user override (revert to AI values) |

### 4.8 Ingredients

**Implementation Status: COMPLETE (API)**

Master ingredient list with fuzzy search and per-entry ingredient linking.

| Capability | Detail |
|---|---|
| Master list | Global ingredient catalog (name + optional category) |
| Fuzzy search | PostgreSQL trigram index (`pg_trgm`) enables typo-tolerant search |
| Search ranking | Results ordered by trigram similarity score descending |
| Entry linking | Link ingredients to entries with optional amount and unit |
| Bulk sync | Replace all ingredients for an entry in a single atomic operation |
| Uniqueness | Each ingredient can only be linked once per entry |

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/ingredients` | Search ingredients (fuzzy, paginated) |
| POST | `/api/v1/ingredients` | Create new ingredient |
| GET | `/api/v1/diary/{entry_id}/ingredients` | List ingredients for entry |
| POST | `/api/v1/diary/{entry_id}/ingredients` | Link ingredient to entry |
| PUT | `/api/v1/diary/{entry_id}/ingredients` | Bulk sync ingredients (replace all) |
| DELETE | `/api/v1/diary/{entry_id}/ingredients/{ingredient_id}` | Unlink ingredient |

### 4.9 Entry Location

**Implementation Status: COMPLETE (API)**

Optional geographic location per diary entry.

| Capability | Detail |
|---|---|
| Location fields | Latitude, longitude, name (e.g., restaurant), address |
| One-to-one | Each entry has at most one location |
| Upsert | Create or update location in a single operation |
| Inline creation | Location can be provided when creating an entry |

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/diary/{id}/location` | Get entry location |
| PUT | `/api/v1/diary/{id}/location` | Upsert entry location |
| DELETE | `/api/v1/diary/{id}/location` | Delete entry location |

### 4.10 Entry Photos

**Implementation Status: COMPLETE (API metadata management), PARTIAL (upload pipeline)**

Photo management for diary entries.

| Capability | Detail |
|---|---|
| Multiple photos | Up to 10 per entry (database trigger enforced) |
| Primary photo | Exactly one photo per entry marked as primary (unique partial index) |
| Ordering | `sort_order` integer for custom ordering |
| Captions | Optional text caption per photo |
| Atomic primary swap | Setting a new primary photo atomically unsets the old one in a single CTE query |

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/diary/{entry_id}/photos` | List photos for entry (ordered) |
| POST | `/api/v1/diary/{entry_id}/photos` | Create photo record (URL, caption, primary, order) |
| PATCH | `/api/v1/diary/{entry_id}/photos/{id}` | Update caption or sort order |
| DELETE | `/api/v1/diary/{entry_id}/photos/{id}` | Delete photo record |
| POST | `/api/v1/diary/{entry_id}/photos/{id}/primary` | Set photo as primary |

**Current Gap:** The API manages photo metadata (URLs, captions, ordering), but the actual photo upload to Cloudflare R2 object storage is not yet implemented as an integrated upload endpoint. The photo URL must currently be provided by the client.

### 4.11 Statistics

**Implementation Status: COMPLETE (API), PARTIAL (Mobile UI not fully built)**

Aggregated nutritional and behavioral statistics over time.

| Capability | Detail |
|---|---|
| Nutrition averages | Average of all 7 nutrients (calories, protein, fat, carbs, fiber, sugar, sodium) over a date range |
| Nutrition totals | Sum of all 7 nutrients over a date range |
| Meal type distribution | Count of entries per meal type |
| Top ingredients | Top 20 most-used ingredients by frequency |
| Combined overview | Single endpoint returning all three stat categories |
| Nutrition source | All nutrition stats source from `user_nutrition`. AI analysis fallback will be added when AI is implemented |
| Date filtering | All stats endpoints accept optional `start_date` and `end_date` |

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/statistics/nutrition` | Nutrition averages and totals |
| GET | `/api/v1/statistics/meal-types` | Meal type distribution |
| GET | `/api/v1/statistics/top-ingredients` | Top 20 ingredients |
| GET | `/api/v1/statistics/overview` | Combined overview |

**Mobile Status:** API query hooks (`statisticsApi.ts`, `useStatisticsQueries.ts`) exist in the diary-feed feature, but dedicated statistics screen UI is not yet built.

### 4.12 User Profile and Settings

**Implementation Status: COMPLETE (API + Mobile)**

User profile management and application settings.

| Capability | Detail |
|---|---|
| Profile display | Display name, email, photo URL |
| Profile editing | Update display name and photo URL |
| Theme | System, light, dark (synced to API) |
| Language | English, Korean (synced to API) |
| Notifications | Toggle enabled/disabled (synced to API) |
| Privacy | Profile public/private toggle (API-side; mobile not yet using) |
| Camera settings | Quality (low/medium/high), AI processing toggle, auto-capture, flash default, save to gallery (local only) |
| Settings sync | Local-first via MMKV, fire-and-forget sync to API when authenticated |
| Sign out | Revokes refresh token, clears JWT store, clears MMKV cache, clears TanStack Query cache |
| Delete account | Server-side: revokes all tokens + soft-deletes user in a transaction |

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/users/me` | Get current user profile |
| PATCH | `/api/v1/users/me` | Update profile (display_name, photo_url) |
| DELETE | `/api/v1/users/me` | Delete account (soft-delete) |
| GET | `/api/v1/users/me/settings` | Get user settings |
| PATCH | `/api/v1/users/me/settings` | Update settings |

---

## 5. User Flows

### 5.1 First-Time User Flow

```
App Launch
    |
    v
Auth Screen (no stored tokens)
    |
    +---> [Sign in with Google] ---> Google OAuth flow ---> API /auth/sign-in
    |                                                            |
    +---> [Sign in with Apple]  ---> Apple Auth flow  -----------+
                                                                 |
                                                                 v
                                                        Receive access_token + refresh_token
                                                                 |
                                                                 v
                                                        Store tokens (MMKV)
                                                        Store user data (MMKV)
                                                                 |
                                                                 v
                                                        Navigate to Diary Feed (Home)
```

### 5.2 Meal Capture Flow

```
Diary Feed
    |
    v
Tap FAB (capture button)
    |
    v
Camera Screen
    |
    +---> Check camera permission ---> [Not granted] ---> Permission Request Screen
    |                                                            |
    |                                                     [Grant] / [Deny]
    |                                                            |
    v                                                            v
Camera Viewfinder                                    Return to Diary (if denied)
    |
    +---> Tap capture button ---> Take photo ---> Add to photo strip
    |         (haptic feedback)                         |
    |                                            [Can capture more? (< 10)]
    |                                                   |
    +---> Tap gallery icon ---> Pick from gallery ---> Add to photo strip
    |
    +---> Toggle flash (off -> on -> auto -> off)
    |
    +---> Tap "Done" when photos captured
              |
              v
         Entry Form
              |
              v
         Select meal type
         Add title / notes
         Optional: add location
              |
              v
         Save entry ---> POST /api/v1/diary
              |
              v
         Navigate to Diary Feed (new entry visible)
```

### 5.3 Entry Detail and Edit Flow

```
Diary Feed ---> Tap entry card
    |
    v
Entry Detail Screen
    |
    +---> View hero image, meal type, time, location
    +---> View AI comment banner
    +---> View/edit notes (inline)
    +---> Set/change star rating (1-5)
    +---> Toggle "would eat again"
    +---> View AI-detected ingredients
    +---> View nutrition breakdown
    |       |
    |       +---> Tap nutrition value ---> Edit nutrition (override AI)
    |                                           |
    |                                           v
    |                                  PUT /api/v1/diary/{id}/nutrition
    |
    +---> Delete entry ---> Confirmation dialog ---> DELETE /api/v1/diary/{id}
                                                          |
                                                          v
                                                  Navigate back to Diary Feed
```

### 5.4 Returning User Flow

```
App Launch
    |
    v
Load tokens from MMKV
    |
    +---> [Tokens present + not expired] ---> Hydrate user from MMKV ---> Diary Feed
    |
    +---> [Tokens present + expired] ---> Auto-refresh via /auth/refresh
    |                                           |
    |                                    [Success] ---> Diary Feed
    |                                    [Failure] ---> Auth Screen
    |
    +---> [No tokens] ---> Auth Screen
```

---

## 6. Technical Architecture Summary

### 6.1 System Architecture

```
+-------------------+         +--------------------+         +------------------+
|   Mobile Client   | <-----> |   Cloudflare Edge  | <-----> |   PostgreSQL     |
|  (React Native)   |  HTTPS  |   Workers + API    |  Hyper  |   (AWS RDS)      |
+-------------------+         |                    |  drive  +------------------+
                              |   +- R2 (photos)   |
                              |   +- KV (cache)    |
                              |   +- Queues        |
                              +--------------------+
```

### 6.2 API Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Language | Rust | 2021 edition |
| Framework | Axum | 0.8 |
| Database driver | SQLx | 0.8 (compile-time checked queries) |
| Database | PostgreSQL | 18 (Alpine) |
| Auth | jsonwebtoken | 9 |
| Token hashing | BLAKE3 | 1 |
| HTTP middleware | tower-http | 0.6 (CORS, tracing, timeout) |
| Observability | tracing + tracing-subscriber | 0.1 / 0.3 |
| API documentation | utoipa + utoipa-swagger-ui | 5 / 9 |
| HTTP client | reqwest | 0.12 |
| Serialization | serde + serde_json | 1 |
| Error handling | thiserror | 2 |

### 6.3 Mobile Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | React Native | 0.83.1 |
| Framework | Expo | 55 |
| Package manager | Bun | -- |
| Router | Expo Router | 55.0.0-beta.2 |
| State (client) | Zustand | 5.0.10 |
| State (server) | TanStack React Query | 5.90.19 |
| Persistence | react-native-mmkv | 4.1.1 |
| Forms | TanStack React Form + Zod | 1.28.0 / 4.3.6 |
| Camera | expo-camera | 55.0.1 |
| Image picker | expo-image-picker | 55.0.1 |
| Animations | react-native-reanimated | 4.2.1 |
| Gestures | react-native-gesture-handler | 2.30.0 |
| List rendering | @shopify/flash-list | 2.2.0 |
| Calendar | react-native-calendars | 1.1313.0 |
| i18n | i18next + react-i18next | 25.8.0 / 16.5.3 |
| Auth (Google) | @react-native-google-signin | 16.1.1 |
| Auth (Apple) | expo-apple-authentication | 55.0.1 |

### 6.4 Infrastructure

| Service | Provider | Purpose |
|---|---|---|
| API hosting | Cloudflare Workers | Edge-deployed API server |
| Database | AWS RDS PostgreSQL | Primary data store |
| Database proxy | Cloudflare Hyperdrive | Connection pooling + edge caching for RDS |
| Object storage | Cloudflare R2 | Photo storage |
| Cache | Cloudflare KV | Edge key-value cache |
| Task queue | Cloudflare Queues | Background job processing |
| Email | Cloudflare Email Routing | Transactional email delivery |
| Error tracking | Sentry | Runtime error monitoring |
| Analytics | PostHog | Product analytics and event tracking |

### 6.5 API Architecture Patterns

- **Feature-based module structure.** Each domain (auth, diary, photos, nutrition, etc.) is a self-contained module with `mod.rs`, `router.rs`, `handlers.rs`, `models.rs`.
- **Repository pattern via static methods.** Entity structs expose static methods for database operations (`User::find_by_id`, `DiaryEntry::create`).
- **RFC 9457 Problem Details.** All errors return structured `application/problem+json` responses with `type`, `title`, `status`, `detail` fields.
- **Typed response wrappers.** `Created<T>` (201), `Ok<T>` (200), `NoContent` (204) ensure consistent HTTP status codes.
- **Extractor-based auth.** `AuthUser` extractor automatically parses JWT from Authorization header; handlers that require auth simply include `auth: AuthUser` as a parameter.
- **Transactional consistency.** Multi-step operations (sign-in, account deletion, ingredient sync) use explicit database transactions.
- **Compile-time SQL.** SQLx checks all queries against the database schema at compile time via `.sqlx/` cached metadata.

### 6.6 Mobile Architecture Patterns

- **Feature-Sliced Design (FSD).** Code is organized into layers: `app > widgets > features > entities > shared`. Imports flow only downward.
- **Hook-first logic.** All business logic lives in custom hooks (`useCamera`, `useEntryDetail`, `useDiaryPage`). UI components are pure presentation.
- **Interface-first design.** Hooks define their return type interface before implementation, serving as a contract.
- **Headless UI components.** Shared UI layer provides headless hooks (`useButton`, `useCard`, `useToggle`) and styled components built on top.
- **Design token system.** Primitive tokens, semantic tokens, and theme-specific tokens (light/dark) for consistent theming.
- **Local-first settings.** Settings are saved to MMKV immediately and synced to the API as a fire-and-forget background operation.

---

## 7. Data Model Overview

### 7.1 Entity Relationship Diagram (Textual)

```
users (1) ----< user_auth_providers (N)     [OAuth provider links]
users (1) ----> user_settings (1)           [Auto-created on user insert]
users (1) ----< auth_tokens (N)             [Refresh tokens per device]
users (1) ----< diary_entries (N)           [Meal diary entries]

diary_entries (1) ----> entry_locations (0..1)   [Optional location]
diary_entries (1) ----< entry_photos (0..10)     [Up to 10 photos]
diary_entries (1) ----> user_nutrition (0..1)    [User override nutrition]
diary_entries (1) ----< ai_analyses (0..N)       [AI analysis results]
diary_entries (1) ----< entry_ingredients (N) -->  ingredients (N)  [Many-to-many]
```

### 7.2 Table Details

**users**
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT (identity) | PRIMARY KEY |
| display_name | TEXT | NOT NULL |
| email | TEXT | NOT NULL, UNIQUE |
| photo_url | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-trigger |
| deleted_at | TIMESTAMPTZ | nullable (soft delete) |

**diary_entries**
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT (identity) | PRIMARY KEY |
| user_id | BIGINT | NOT NULL, FK -> users |
| meal_type | meal_type (enum) | NOT NULL |
| title | TEXT | NOT NULL |
| notes | TEXT | nullable |
| eaten_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-trigger |
| deleted_at | TIMESTAMPTZ | nullable (soft delete) |

*Indexes:* `(user_id)`, `(user_id, eaten_at)`, `(user_id, meal_type)`

**meal_type enum values:** breakfast, lunch, dinner, snack, dessert, drink, other

**entry_photos**
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT (identity) | PRIMARY KEY |
| entry_id | BIGINT | NOT NULL, FK -> diary_entries (CASCADE) |
| url | TEXT | NOT NULL |
| caption | TEXT | nullable |
| is_primary | BOOLEAN | NOT NULL, DEFAULT false |
| sort_order | INT | NOT NULL, DEFAULT 0 |

*Constraints:* Unique partial index on `(entry_id) WHERE is_primary = true`. Trigger enforces max 10 photos per entry.

**user_nutrition**
| Column | Type | Constraints |
|---|---|---|
| entry_id | BIGINT | NOT NULL, UNIQUE, FK -> diary_entries |
| calories | NUMERIC(8,2) | CHECK >= 0 |
| protein_grams | NUMERIC(8,2) | CHECK >= 0 |
| fat_grams | NUMERIC(8,2) | CHECK >= 0 |
| carbs_grams | NUMERIC(8,2) | CHECK >= 0 |
| fiber_grams | NUMERIC(8,2) | CHECK >= 0 |
| sugar_grams | NUMERIC(8,2) | CHECK >= 0 |
| sodium_mg | NUMERIC(8,2) | CHECK >= 0 |

**ai_analyses**
| Column | Type | Constraints |
|---|---|---|
| entry_id | BIGINT | NOT NULL, FK -> diary_entries |
| calories - sodium_mg | NUMERIC(8,2) | nullable |
| description | TEXT | nullable |
| confidence_score | NUMERIC(3,2) | nullable (0.00-1.00) |
| raw_response | JSONB | nullable |

*Note:* Multiple analyses can exist per entry. Latest (by `created_at`) is used.

**ingredients**
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT (identity) | PRIMARY KEY |
| name | TEXT | NOT NULL, UNIQUE |
| category | TEXT | nullable |

*Index:* GIN trigram index on `name` for fuzzy search.

**entry_ingredients**
| Column | Type | Constraints |
|---|---|---|
| entry_id | BIGINT | FK -> diary_entries (CASCADE) |
| ingredient_id | BIGINT | FK -> ingredients (CASCADE) |
| amount | TEXT | nullable |
| unit | TEXT | nullable |

*Constraint:* UNIQUE `(entry_id, ingredient_id)`

### 7.3 Database Features

- **PostgreSQL extensions:** `uuid-ossp`, `pg_trgm`
- **Automatic `updated_at` triggers** on: users, user_settings, diary_entries, entry_locations, entry_photos, user_nutrition
- **Max photos trigger:** Prevents INSERT on entry_photos when count >= 10 for the entry
- **Auto settings creation:** Trigger creates user_settings row on user INSERT
- **Soft deletes:** Users and diary entries use `deleted_at` timestamp; all queries filter `WHERE deleted_at IS NULL`
- **Cascading deletes:** Child records (photos, nutrition, locations, ingredients) cascade delete when parent entry is deleted

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target | Current Implementation |
|---|---|---|
| API response time (p95) | < 200ms | Cloudflare Workers edge deployment; connection pooling via Hyperdrive; 30-second request timeout configured |
| Database query time (p95) | < 50ms | Indexed queries on user_id, eaten_at, meal_type; trigram GIN index for ingredient search |
| App launch to interactive | < 2 seconds | MMKV synchronous storage for token hydration; no network call required for cached user data |
| Photo capture to confirmation | < 500ms | 0.8 quality JPEG; no upload blocking capture flow |
| Pagination limits | 1-100 per page | Server-enforced via `.clamp(1, 100)` |
| Connection pool | 10 max connections | PgPoolOptions with 3-second acquire timeout |

### 8.2 Security

| Requirement | Implementation |
|---|---|
| Authentication | OAuth-only (Google, Apple); no password storage |
| Token security | Access tokens are short-lived JWTs; refresh tokens are hashed with BLAKE3 before storage |
| Token rotation | Single-use refresh tokens; new token issued on each refresh |
| Reuse detection | Reused refresh token triggers revocation of ALL user tokens (protects against token theft) |
| Authorization | Every API endpoint (except auth) requires valid JWT via AuthUser extractor |
| Ownership verification | All diary/photo/nutrition operations verify user_id ownership before proceeding |
| Data isolation | All queries include `user_id = $N` filter; no cross-user data access possible |
| Soft delete | User and entry deletions are reversible (no data permanently lost) |
| Account deletion | Atomic: revokes all tokens and soft-deletes user in a single transaction |
| Error masking | Internal errors return generic messages; detailed errors logged server-side only |
| CORS | Explicit origin allowlist in production; permissive in development |
| API timeout | 30-second server-side timeout on all requests |
| Client timeout | Configurable request timeout with AbortController on mobile |
| Input validation | Database CHECK constraints prevent negative nutrition values; trigger prevents photo overflow |

### 8.3 Internationalization (i18n)

| Requirement | Implementation |
|---|---|
| Supported languages | English (en), Korean (ko) |
| Framework | i18next + react-i18next |
| Module structure | Namespaced translation files: common, camera, diary, errors, navigation, settings |
| Language detection | Follows device locale via expo-localization |
| User override | Language setting in user preferences (stored locally + synced to API) |
| Code comments | Korean comments present in entity types for domain terms (e.g., "// 만족도 (1-5)", "// 다시 먹고 싶어요") |

### 8.4 Accessibility

| Requirement | Status |
|---|---|
| Screen reader support | Partial (standard React Native accessibility props) |
| Dynamic text sizing | Not yet implemented |
| Color contrast | Theme token system supports light/dark; specific WCAG compliance not yet verified |
| Haptic feedback | Implemented for camera interactions (capture, success, warning, error) |

### 8.5 Reliability

| Requirement | Implementation |
|---|---|
| Error tracking | Sentry integration (configured in infrastructure) |
| Graceful shutdown | API server handles SIGINT/SIGTERM gracefully |
| Offline capability | MMKV-based local storage for entries, settings, and auth tokens; app usable offline for reading cached data |
| Network resilience | API client retries 401 errors automatically; refresh token mutex prevents concurrent refresh races |
| Data consistency | Database transactions for multi-step operations; triggers for business rule enforcement |

---

## 9. Current Status and Roadmap

### 9.1 Implementation Status Summary

| Feature | API | Mobile | Notes |
|---|---|---|---|
| Authentication (OAuth) | Complete | Complete | Google + Apple; token rotation with reuse detection |
| Meal capture (camera) | N/A | Complete | Camera, gallery, multi-photo, haptics |
| Diary feed | Complete | Complete | Week selector, entry cards, pagination |
| Search and filter | Complete | Complete | Text search, meal type, date range, sorting |
| Entry detail | Complete | Complete | Hero image, notes, nutrition, ingredients, delete |
| AI analysis | Stubbed (501) | Types Defined | Deferred to post-MVP; interface preserved for future implementation |
| Nutrition tracking | Complete | Partial | API full; mobile display works, override UI partial |
| Ingredients | Complete | Partial | API full (fuzzy search, bulk sync); mobile not fully connected |
| Location | Complete | Partial | API full; mobile entity type defined, UI integration partial |
| Entry photos | Metadata Complete | Capture Complete | R2 upload pipeline not implemented |
| Statistics | Complete | Partial | API full; mobile has query hooks but no dedicated UI screen |
| User profile | Complete | Complete | View, edit, delete account |
| Settings | Complete | Complete | Theme, language, notifications, camera settings |

### 9.2 Known Gaps and Incomplete Areas

**Priority 1 -- Required for launch:**

1. **Photo upload pipeline.** Photos are captured on mobile but there is no integrated flow to upload them to Cloudflare R2 and store the resulting URL. The API photo endpoints accept URLs but do not provide upload functionality. This is the critical missing piece between camera capture and diary persistence.

2. **Entry creation end-to-end flow.** On mobile, the `handleDone` function in `useCamera` currently clears photos and shows a toast, but does not actually POST to the diary API or upload photos. The `useEntryForm` hook exists but the full wiring from camera capture through photo upload through entry creation is incomplete.

**Priority 2 -- Important for user experience:**

3. **Statistics mobile UI.** The API provides nutrition averages, meal type distribution, and top ingredients. Mobile has the query hooks ready. A dedicated statistics screen with charts and visualizations needs to be built.

4. **Rating and would-eat-again API persistence.** These fields exist in the mobile Entry type and are editable in the detail view, but they are only stored locally. The API diary_entries table does not have these columns yet.

5. **Nutrition override UI.** The API supports full CRUD for user nutrition overrides. The mobile entry detail displays nutrition but the editing interface for overriding values needs polish.

6. **Full-screen photo viewer.** Tapping the hero image in entry detail has a TODO comment; the fullscreen viewer is not implemented.

**Priority 3 -- Future enhancements:**

7. **AI service integration.** The AI analysis data model, API endpoints (currently returning 501), and mobile type definitions are preserved. The full pipeline — sending photos to a vision model, parsing results, creating analysis records — will be implemented post-MVP. This includes re-adding `COALESCE(user_nutrition, ai_analysis)` fallback to statistics queries.

8. **Cloudflare Queue consumers.** Queues are listed in infrastructure but no worker consumers are implemented. Needed for background AI analysis, image processing, etc.

9. **Email notifications via Cloudflare Email Routing.** Email infrastructure is listed but no email sending is implemented.

10. **Social/privacy features.** The `privacy_profile_public` setting exists in the database but no social features (sharing, public profiles, feed) are built.

11. **Real-time sync.** No WebSocket or push notification infrastructure for cross-device sync.

### 9.3 Roadmap

#### Phase 1: Core Loop Completion

Goal: Complete the capture-to-diary loop so a user can photograph a meal, enter nutrition manually, and see it in their diary.

| Milestone | Deliverables |
|---|---|
| M1.1: Photo Upload | R2 upload endpoint; mobile upload service; wiring from camera capture to R2 to photo record creation |
| M1.2: End-to-End Entry Creation | Connect camera -> photo upload -> entry creation -> diary feed refresh |
| M1.3: Nutrition Override UI | Polish inline nutrition editing in entry detail; connect to PUT /nutrition endpoint |

#### Phase 2: Insights and Polish

Goal: Help users understand their eating patterns and polish the overall experience.

| Milestone | Deliverables |
|---|---|
| M2.1: Statistics Screen | Nutrition charts, meal type distribution pie chart, top ingredients list, date range selector |
| M2.2: Rating Persistence | Add rating + would_eat_again columns to API; sync mobile values |
| M2.3: Photo Viewer | Full-screen photo gallery with swipe navigation |
| M2.4: Onboarding | First-time user tutorial; camera permission education |

#### Phase 3: AI Analysis Pipeline

Goal: Add AI-powered meal recognition and nutritional estimation.

| Milestone | Deliverables |
|---|---|
| M3.1: AI Model Integration | Vision API integration; automatic analysis on entry creation; results stored via existing 501-stubbed endpoints |
| M3.2: AI Nutrition Fallback | Re-add `COALESCE(user_nutrition, ai_analysis)` to statistics queries; AI values as fallback when no user override |
| M3.3: Queue Workers | Cloudflare Queue consumers for async AI analysis and image optimization |

#### Phase 4: Notifications and Engagement

Goal: Keep users engaged and move heavy operations to background.

| Milestone | Deliverables |
|---|---|
| M4.1: Push Notifications | Meal logging reminders; daily/weekly summary notifications |
| M4.2: Email Digest | Weekly nutrition summary email via Cloudflare Email Routing |
| M4.3: Streak and Gamification | Logging streak tracking; achievement badges |
| M4.4: Nutrition Goals | Set daily calorie/macro targets; progress tracking |

#### Phase 5: Growth

Goal: Features that drive retention and potential social engagement.

| Milestone | Deliverables |
|---|---|
| M5.1: Export | Export diary data as CSV/PDF |
| M5.2: Social (Exploration) | Evaluate: public profiles, shared meals, community features |

---

## 10. Success Metrics and KPIs

### 10.1 North Star Metric

**Weekly Active Loggers (WAL):** The number of unique users who log at least 3 meals in a given week.

Rationale: This metric captures both acquisition (they opened the app) and engagement (they used the core feature multiple times). A user who logs 3+ meals per week is getting genuine value from the product.

### 10.2 Leading Indicators

| Metric | Target | Measurement |
|---|---|---|
| Time to first entry | < 60 seconds from sign-in | Track time delta between auth completion and first POST /diary |
| Photos captured per session | >= 1.5 average | Count of photos taken per app open session |
| Camera-to-diary conversion rate | > 80% | Percentage of camera sessions that result in a saved diary entry |
| AI analysis acceptance rate | > 60% | Percentage of AI nutrition estimates that users do NOT override |
| Session frequency | >= 3 sessions/week per active user | PostHog session tracking |

### 10.3 Lagging Indicators

| Metric | Target | Timeframe |
|---|---|---|
| Day-7 retention | > 40% | Users returning 7 days after sign-up |
| Day-30 retention | > 20% | Users returning 30 days after sign-up |
| Entries per active user per week | >= 5 | Rolling weekly average |
| Monthly Active Users (MAU) growth | > 15% MoM | Month-over-month growth rate |
| Account deletion rate | < 5% | Percentage of users who delete accounts within 30 days |

### 10.4 Quality Metrics

| Metric | Target | Measurement |
|---|---|---|
| API error rate (5xx) | < 0.1% | Sentry + Cloudflare analytics |
| API latency (p95) | < 200ms | Cloudflare Workers metrics |
| App crash rate | < 0.5% | Sentry mobile SDK |
| AI analysis accuracy (user-validated) | > 70% within 20% margin | Compare AI estimates to user overrides when overrides exist |

### 10.5 Monitoring Cadence

| Frequency | Metrics Reviewed |
|---|---|
| Real-time | Error rates, API latency, crash rate (Sentry dashboards) |
| Daily | DAU, entries created, new sign-ups |
| Weekly | WAL, retention cohorts, AI accuracy, session metrics |
| Monthly | MAU, growth rate, feature adoption rates, NPS (if surveyed) |

---

## 11. Constraints and Dependencies

### 11.1 Technical Constraints

| Constraint | Impact | Mitigation |
|---|---|---|
| Cloudflare Workers compute limits | Workers have CPU time limits per request; AI analysis cannot run inline | Use Cloudflare Queues for async AI processing |
| R2 upload size limits | Photos must be reasonably compressed before upload | Client-side compression at 0.8 quality; consider server-side resize pipeline |
| PostgreSQL via Hyperdrive | Hyperdrive adds edge caching but may introduce consistency lag for writes | Use direct connection for write-heavy operations if needed |
| Expo managed workflow | Some native modules may not be available without ejecting | All current dependencies are Expo-compatible |
| Offline limitations | Full offline write capability requires conflict resolution strategy | Phase 1 is online-first; offline reads from MMKV cache only |

### 11.2 External Dependencies

| Dependency | Risk | Fallback |
|---|---|---|
| Google OAuth | Service outage blocks Google sign-in | Apple Sign-In as alternative; cached tokens allow existing users to continue |
| Apple Sign-In | Required for iOS App Store compliance | Already implemented as primary alternative to Google |
| AI Vision API (TBD) | Model accuracy, latency, cost per request | Allow manual entry fallback; batch analysis via queues to manage cost |
| Cloudflare services | Infrastructure dependency for API, storage, caching | Multi-region deployment; local development stack (Docker Compose for PostgreSQL) available |
| Cloudflare Email Routing | Required for transactional emails | Not yet critical; email features are Phase 4 |
| Sentry | Error tracking dependency | Graceful degradation; errors logged to stdout as fallback |
| PostHog | Analytics dependency | No user-facing impact if unavailable; analytics data gap only |

### 11.3 Business Constraints

| Constraint | Detail |
|---|---|
| Bilingual requirement | All user-facing text must be available in both English and Korean before launch |
| Privacy-first | No user data sharing between users in Phase 1; social features are Phase 4 exploration only |
| App Store compliance | Apple Sign-In required for iOS; privacy nutrition labels; data deletion capability (already implemented) |
| AI cost management | Per-request AI analysis costs must be monitored; may need to throttle or cache analysis for identical/similar photos |

### 11.4 Team and Resource Assumptions

This PRD assumes:
- A small development team (1-3 engineers) working across both mobile and API
- The existing codebase is the foundation; no rewrites planned
- Infrastructure (Cloudflare, AWS RDS) is already provisioned
- AI model provider selection is pending (options: OpenAI GPT-4o Vision, Google Gemini, Claude, custom fine-tuned model)

---

## Appendix A: Complete API Endpoint Reference

| Method | Path | Auth | Tag | Description |
|---|---|---|---|---|
| POST | `/api/v1/auth/sign-in` | No | Auth | Exchange OAuth token for JWT |
| POST | `/api/v1/auth/refresh` | No | Auth | Rotate refresh token |
| POST | `/api/v1/auth/revoke` | Yes | Auth | Revoke refresh token |
| GET | `/api/v1/users/me` | Yes | Users | Get current user |
| PATCH | `/api/v1/users/me` | Yes | Users | Update profile |
| DELETE | `/api/v1/users/me` | Yes | Users | Delete account |
| GET | `/api/v1/users/me/settings` | Yes | Users | Get settings |
| PATCH | `/api/v1/users/me/settings` | Yes | Users | Update settings |
| GET | `/api/v1/diary` | Yes | Diary | List entries (paginated, filtered) |
| POST | `/api/v1/diary` | Yes | Diary | Create entry |
| GET | `/api/v1/diary/{id}` | Yes | Diary | Get entry detail |
| PATCH | `/api/v1/diary/{id}` | Yes | Diary | Update entry |
| DELETE | `/api/v1/diary/{id}` | Yes | Diary | Soft-delete entry |
| GET | `/api/v1/diary/{id}/location` | Yes | Diary | Get entry location |
| PUT | `/api/v1/diary/{id}/location` | Yes | Diary | Upsert location |
| DELETE | `/api/v1/diary/{id}/location` | Yes | Diary | Delete location |
| GET | `/api/v1/diary/{entry_id}/photos` | Yes | Photos | List entry photos |
| POST | `/api/v1/diary/{entry_id}/photos` | Yes | Photos | Create photo record |
| PATCH | `/api/v1/diary/{entry_id}/photos/{id}` | Yes | Photos | Update photo |
| DELETE | `/api/v1/diary/{entry_id}/photos/{id}` | Yes | Photos | Delete photo |
| POST | `/api/v1/diary/{entry_id}/photos/{id}/primary` | Yes | Photos | Set primary photo |
| GET | `/api/v1/diary/{entry_id}/nutrition` | Yes | Nutrition | Get user nutrition override |
| PUT | `/api/v1/diary/{entry_id}/nutrition` | Yes | Nutrition | Upsert nutrition |
| DELETE | `/api/v1/diary/{entry_id}/nutrition` | Yes | Nutrition | Delete nutrition override |
| GET | `/api/v1/diary/{entry_id}/analysis` | Yes | AI Analysis | Get latest analysis |
| POST | `/api/v1/diary/{entry_id}/analysis` | Yes | AI Analysis | Create analysis |
| GET | `/api/v1/diary/{entry_id}/ingredients` | Yes | Ingredients | List entry ingredients |
| POST | `/api/v1/diary/{entry_id}/ingredients` | Yes | Ingredients | Link ingredient |
| PUT | `/api/v1/diary/{entry_id}/ingredients` | Yes | Ingredients | Bulk sync ingredients |
| DELETE | `/api/v1/diary/{entry_id}/ingredients/{ingredient_id}` | Yes | Ingredients | Unlink ingredient |
| GET | `/api/v1/ingredients` | Yes | Ingredients | Search ingredients (fuzzy) |
| POST | `/api/v1/ingredients` | Yes | Ingredients | Create ingredient |
| GET | `/api/v1/statistics/nutrition` | Yes | Statistics | Nutrition stats |
| GET | `/api/v1/statistics/meal-types` | Yes | Statistics | Meal type distribution |
| GET | `/api/v1/statistics/top-ingredients` | Yes | Statistics | Top 20 ingredients |
| GET | `/api/v1/statistics/overview` | Yes | Statistics | Combined overview |
| GET | `/health` | No | System | Health check |

---

## Appendix B: Glossary

| Term | Definition |
|---|---|
| Entry | A single diary entry representing one meal event, including photos, nutrition, location, and metadata |
| Meal type | One of: breakfast, lunch, dinner, snack, dessert, drink, other |
| AI analysis | AI-generated nutrition estimates and food recognition results for a single entry |
| User nutrition | User-provided nutrition values that override AI estimates for a specific entry |
| Soft delete | Setting a `deleted_at` timestamp instead of removing the row; record is excluded from queries but recoverable |
| Token rotation | Issuing a new refresh token and revoking the old one on every token refresh operation |
| Reuse detection | Security mechanism that revokes all user tokens when a previously-used refresh token is presented again |
| FSD | Feature-Sliced Design: mobile architecture pattern with layered imports (app > widgets > features > entities > shared) |
| MMKV | High-performance key-value storage for React Native, used for offline caching and settings persistence |

---

*This document reflects the state of the Mealio codebase as of 2026-02-03. It should be updated as features are completed and requirements evolve.*

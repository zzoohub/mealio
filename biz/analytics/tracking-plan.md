# Tracking Plan -- Mealio

Last updated: 2026-03-10

## Aha Moment

- **Hypothesis**: User logs 3 meals with photos within 7 days of first use
- **Event**: `aha_moment_reached`
- **Status**: Hypothesis (needs validation once we have sufficient data)
- **Rationale**: Meal tracking apps live or die on habit formation. A user who captures 3 meals in the first week has demonstrated intent to make Mealio part of their daily routine. The photo-first flow is Mealio's core differentiator, so photo capture (not just viewing) is the meaningful action.

### Alternative Aha Moment candidates to test

1. "Viewed AI analysis results on first entry" -- AI nutrition analysis is a premium value-add
2. "Returned to diary feed on Day 2+" -- simple retention signal
3. "Searched or browsed past entries" -- indicates the diary has become a reference tool

---

## User Properties (set once per user, applied to all events)

| Property | Set When | Example Values | Notes |
|----------|----------|----------------|-------|
| `auth_mode` | App start / auth change | `guest`, `authenticated` | Critical segmentation axis |
| `auth_provider` | Login completed | `google`, `apple` | |
| `signup_date` | First app open | `2026-03-10` | First-ever launch |
| `device_platform` | App start | `ios`, `android` | From `Platform.OS` |
| `device_os_version` | App start | `18.3`, `15` | From `Platform.Version` |
| `app_version` | App start | `1.0.2` | Expo Constants |
| `language` | Settings load | `en`, `ko` | Display language |
| `theme` | Settings load | `light`, `dark`, `system` | |

---

## Events

### P0 -- Must Have (Core funnel + Aha Moment + Retention)

These events define the critical path: Install -> First Capture -> Aha Moment -> Retained User. Without them, you cannot calculate activation rate, retention, or Carrying Capacity.

| # | Event | Trigger | Properties | File to Instrument |
|---|-------|---------|------------|--------------------|
| 1 | `app_opened` | App comes to foreground | `session_number`, `days_since_first_open`, `auth_mode` | `mobile/src/app/providers/AppProvider.tsx` -- inside `AppInitializer` useEffect, after `loadUserFromStorage` resolves |
| 2 | `signup_completed` | Auth store `login` succeeds | `auth_provider`, `is_new_user` (from API response), `time_since_app_opened` | `mobile/src/features/auth/model/authStore.ts` -- in `login` action, after `set({ user, ... })` |
| 3 | `auth_started` | User taps Google or Apple sign-in button | `auth_provider` | `mobile/src/features/auth/model/useGoogleAuth.ts` -- top of `signIn()` callback; `mobile/src/features/auth/model/useAppleAuth.ts` -- top of `signIn()` callback |
| 4 | `auth_failed` | OAuth error (not user cancellation) | `auth_provider`, `error_code`, `error_message` | `mobile/src/features/auth/model/useGoogleAuth.ts` -- in catch block (excluding `SIGN_IN_CANCELLED`); `mobile/src/features/auth/model/useAppleAuth.ts` -- in catch block (excluding `ERR_REQUEST_CANCELED`) |
| 5 | `meal_capture_started` | Camera screen opens | `source` (`camera`, `gallery`, `diary_album`), `auth_mode`, `is_past_date` | `mobile/src/features/capture-meal/model/useCamera.ts` -- in hook initialization (useEffect on mount) |
| 6 | `photo_captured` | Photo taken or picked from gallery | `source` (`camera`, `gallery`), `photo_count` (total after adding), `auth_mode` | `mobile/src/features/capture-meal/model/useCamera.ts` -- after `setCapturedPhotos` in `capturePhoto` and in `pickFromGallery` |
| 7 | `meal_saved` | Entry save initiated (handleDone completes) | `photo_count`, `meal_type`, `auth_mode`, `has_location`, `time_in_capture_seconds`, `source` | `mobile/src/features/capture-meal/model/useCamera.ts` -- in `handleDone` after successful `onSaveEntry` call |
| 8 | `entry_viewed` | Entry detail screen loads with data | `entry_id`, `auth_mode`, `has_ai_analysis`, `has_photos`, `meal_type`, `time_since_creation_hours` | `mobile/src/features/entry-detail/model/useEntryDetail.ts` -- in a useEffect when `entry` first becomes non-null |
| 9 | `ai_analysis_completed` | AI analysis status becomes `completed` | `entry_id`, `wait_time_seconds` (time from entry creation to completion) | `mobile/src/features/entry-detail/model/useEntryDetail.ts` -- in a useEffect watching `aiAnalysisStatus` transitioning to `completed` |
| 10 | `entry_deleted` | Delete confirmed | `entry_id`, `auth_mode`, `entry_age_days` | `mobile/src/features/entry-detail/model/useEntryDetail.ts` -- inside `deleteEntry` onPress callback, before `router.back()` |
| 11 | `guest_limit_reached` | Guest user hits 10-entry cap | `entry_count` | `mobile/src/features/capture-meal/model/useCamera.ts` -- in `showGuestLimitToast` |
| 12 | `guest_converted` | Guest user successfully logs in | `auth_provider`, `guest_entry_count`, `days_as_guest` | `mobile/src/features/auth/model/authStore.ts` -- in `login` action, detect if previous state had no user but had guest entries |

### P1 -- Important (Engagement depth + Feature adoption)

These events measure engagement quality: are users getting value beyond basic capture? They feed feature adoption analysis and help prioritize the roadmap.

| # | Event | Trigger | Properties | File to Instrument |
|---|-------|---------|------------|--------------------|
| 13 | `diary_feed_viewed` | Diary screen loads | `auth_mode`, `entry_count` (for selected date), `selected_date_offset` (days from today) | `mobile/app/diary/index.tsx` -- in a useEffect on mount or when `entries` first loads |
| 14 | `entry_edited` | Any field updated on entry detail | `field` (`notes`, `rating`, `meal_type`, `would_eat_again`, `ingredients`, `nutrition`, `timestamp`), `auth_mode` | `mobile/src/features/entry-detail/model/useEntryDetail.ts` -- inside each `update*` callback (debounced to avoid noise) |
| 15 | `entry_shared` | Share action triggered | `entry_id`, `platform` | `mobile/src/features/entry-detail/model/useEntryDetail.ts` -- in `shareEntry` |
| 16 | `search_performed` | Search query submitted (debounced) | `query_length`, `results_count`, `has_filters`, `auth_mode` | `mobile/src/features/search-entries/model/useEntrySearch.ts` -- in the loadData effect, after results are set |
| 17 | `search_filter_applied` | Any filter changed | `filter_type` (`meal_type`, `date_range`, `would_eat_again`, `sort`), `filter_value` | `mobile/src/features/search-entries/model/useEntrySearch.ts` -- in respective setter callbacks |
| 18 | `photos_added_to_entry` | Additional photos added to existing entry | `entry_id`, `new_photo_count`, `total_photo_count` | `mobile/src/features/entry-detail/model/useEntryDetail.ts` -- in `addPhotos` after successful upload |
| 19 | `upload_completed` | Upload processor finishes an item | `entry_id`, `photo_count`, `upload_duration_seconds` | `mobile/src/entities/entry/model/useUploadProcessor.ts` -- after `remove(item.tempId)` |
| 20 | `upload_failed` | Upload processor marks item failed | `error_type`, `retry_count` | `mobile/src/entities/entry/model/useUploadProcessor.ts` -- in the catch block |
| 21 | `ai_analysis_retried` | User taps retry on failed analysis | `entry_id` | `mobile/src/features/entry-detail/model/useEntryDetail.ts` -- in `retryAiAnalysis` |
| 22 | `ai_analysis_failed` | AI analysis status becomes `failed` | `entry_id` | `mobile/src/features/entry-detail/model/useEntryDetail.ts` -- useEffect watching `aiAnalysisStatus` transitioning to `failed` |

### P2 -- Nice to Have (Settings, navigation patterns, UX polish)

Lower priority events that fill in the picture. Implement after P0+P1 are validated and stable.

| # | Event | Trigger | Properties | File to Instrument |
|---|-------|---------|------------|--------------------|
| 23 | `settings_changed` | Any setting updated | `setting_category` (`display`, `notifications`, `camera`), `setting_name`, `old_value`, `new_value` | `mobile/src/features/settings/model/settingsStore.ts` -- in each `update*` action |
| 24 | `calendar_opened` | Bottom sheet calendar opened | `current_date_offset` | `mobile/app/diary/index.tsx` -- in `handleOpenCalendar` |
| 25 | `date_navigated` | User selects a different date in diary | `date_offset` (days from today), `method` (`week_selector`, `calendar`) | `mobile/src/features/entry-feed/model/useEntryFeedPage.ts` -- in `selectDate` and `handleCalendarDayPress` |
| 26 | `logout_completed` | User signs out | `session_duration_days` | `mobile/src/features/auth/model/authStore.ts` -- in `logout` action, after clearing tokens |
| 27 | `account_deleted` | User deletes account | `account_age_days`, `total_entries` | Wherever `useDeleteAccount` is called (settings feature) |
| 28 | `album_load_initiated` | User taps "load from album" on diary page | `is_today`, `auth_mode` | `mobile/app/diary/index.tsx` -- in `handleLoadFromAlbum` |
| 29 | `error_boundary_hit` | Error boundary catches crash | `error_message`, `component_stack` | `mobile/src/app/providers/AppProvider.tsx` -- in `handleError` |

---

## Funnels to Track

### 1. Core Activation Funnel (P0)

```
app_opened (first time)
  -> meal_capture_started
    -> photo_captured
      -> meal_saved
        -> entry_viewed (with AI analysis)
```

**Why**: This is the single most important funnel. The drop-off between each step tells you exactly where users abandon the core experience. A meal tracking app where users never complete a capture is dead.

### 2. Guest-to-Auth Conversion Funnel (P0)

```
app_opened (auth_mode=guest)
  -> meal_saved (auth_mode=guest, count >= 1)
    -> guest_limit_reached
      -> auth_started
        -> signup_completed / guest_converted
```

**Why**: Guest mode is the trial. Understanding how many guests convert (and when) determines if the guest-to-auth bridge works or if it's a leaky bucket.

### 3. Retention Funnel (P0)

```
signup_completed (or first app_opened)
  -> meal_saved (Day 0)
    -> app_opened (Day 1)
      -> meal_saved (Day 1-7, count >= 3) [Aha Moment candidate]
        -> app_opened (Day 7)
          -> app_opened (Day 30)
```

**Why**: This is how you detect the retention plateau (or lack thereof). Each step is a retention cohort boundary.

### 4. AI Analysis Engagement Funnel (P1)

```
meal_saved (auth_mode=authenticated, with photos)
  -> upload_completed
    -> ai_analysis_completed
      -> entry_viewed (has_ai_analysis=true)
        -> entry_edited (field=nutrition OR field=ingredients)
```

**Why**: AI analysis is the premium differentiator. If users save meals but never view AI results, or view them but never act on the nutrition data, the feature is not delivering value.

### 5. Search & Browse Funnel (P1)

```
diary_feed_viewed
  -> search_performed OR search_filter_applied
    -> entry_viewed (from search)
```

**Why**: Measures whether the diary becomes a reference tool (a retention driver) or just a dumping ground.

---

## Dashboards to Build

### 1. Activation Monitor (P0)

- Daily new users (by auth_mode)
- Core activation funnel conversion rates (week over week)
- Time to first meal_saved
- Aha Moment reach rate (3 meals in 7 days)

### 2. Retention Monitor (P0)

- D1 / D7 / D14 / D30 cohort retention curves
- Usage frequency distribution (meals per week per user)
- Return rate by auth_mode (guest vs authenticated)

### 3. Feature Adoption (P1)

- AI analysis view rate (entries with completed analysis / total entries)
- Search usage rate (users who searched / total active users)
- Entry edit rate (entries edited / total entries)
- Photo count distribution per entry
- Share rate

### 4. Guest Conversion (P1)

- Guest entry count distribution at conversion
- Days as guest before conversion
- Guest limit reached -> conversion rate
- Guest churn rate (guests who never return after Day 1)

---

## Implementation Notes

### PostHog Integration

PostHog is already listed as the analytics tool in the infrastructure doc. The SDK needs to be installed and initialized.

**Initialization point**: `mobile/src/app/providers/AppProvider.tsx` -- initialize PostHog client in the provider, wrapping the app with `PostHogProvider`.

**User identification**: Call `posthog.identify(userId)` in `authStore.ts` after successful login. Call `posthog.reset()` on logout.

**Super properties**: Set `auth_mode`, `app_version`, `device_platform` as super properties on every session start in `AppInitializer`.

### Event Firing Pattern

All events should flow through a single analytics utility module:

```
mobile/src/shared/lib/analytics.ts
```

This module wraps PostHog calls, enforces naming conventions, and provides a type-safe interface. Never call `posthog.capture()` directly from feature code -- always go through the wrapper. This makes it easy to add event validation, logging in dev mode, and swap providers if needed.

### Guest Mode Considerations

Guest users do not have a server-side user ID. PostHog will use its own anonymous `distinct_id`. When a guest converts to authenticated, call `posthog.alias(anonymousId, authenticatedUserId)` to merge the two identity profiles.

### What NOT to Track

- PII: Never include email, name, or photos in event properties
- High-frequency noise: Do not track every scroll, every keystroke, or every animation frame
- Redundant with PostHog autocapture: Do not manually track `$pageview` or `$screen` if PostHog React Native SDK autocapture is enabled

---

## Validation Checklist

- [ ] Events fire on correct triggers (test manually in dev with PostHog debug mode)
- [ ] Properties populate with correct types and values
- [ ] No duplicate events (especially on re-renders or navigation back/forth)
- [ ] `auth_mode` is present on every event
- [ ] User identification works (guest anonymous ID merges on conversion)
- [ ] No PII in event properties
- [ ] Event names follow `object_action` convention
- [ ] Dev/test accounts filtered in PostHog

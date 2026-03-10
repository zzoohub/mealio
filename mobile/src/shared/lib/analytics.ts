import PostHog from "posthog-react-native";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { STORAGE_KEYS } from "@/shared/config";
import { storage } from "@/shared/lib/storage";

// =============================================================================
// CONSTANTS
// =============================================================================

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "";
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const FIRST_OPEN_KEY = "analytics_first_open_at";

// =============================================================================
// SINGLETON
// =============================================================================

let client: PostHog | null = null;

export function initAnalytics() {
  if (client || !POSTHOG_API_KEY) return;

  client = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    // Disable automatic capture — we instrument manually
    autocapture: false,
  });

  // Dev: don't send to PostHog, rely on console.log in track()
  if (__DEV__) {
    client.optOut();
  }

  // Record first open timestamp if not already set
  const firstOpen = storage.get<string>(FIRST_OPEN_KEY);
  if (!firstOpen) {
    storage.set(FIRST_OPEN_KEY, new Date().toISOString());
  }
}

// =============================================================================
// IDENTITY
// =============================================================================

/**
 * Identify an authenticated user. Call after successful login.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  client?.identify(userId, {
    auth_mode: "authenticated",
    device_platform: Platform.OS,
    device_os_version: String(Platform.Version),
    app_version: Constants.expoConfig?.version ?? "unknown",
    ...properties,
  });
}

/**
 * Merge anonymous (guest) profile into the authenticated user profile.
 * Call when a guest user converts to authenticated.
 */
export function aliasUser(userId: string) {
  client?.alias(userId);
}

/**
 * Reset identity on logout.
 */
export function resetUser() {
  client?.reset();
}

// =============================================================================
// SUPER PROPERTIES (attached to every event automatically)
// =============================================================================

function getAuthMode(): "authenticated" | "guest" {
  // Inline check to avoid circular imports with auth module
  return storage.get(STORAGE_KEYS.USER_DATA) ? "authenticated" : "guest";
}

// =============================================================================
// EVENT TRACKING
// =============================================================================

/**
 * Track an analytics event. All events go through this function.
 * `auth_mode` is automatically appended to every event.
 */
export function track(event: string, properties?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[Analytics] ${event}`, properties ?? "");
  }
  client?.capture(event, {
    auth_mode: getAuthMode(),
    device_platform: Platform.OS,
    ...properties,
  });
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Days since the user's first app open.
 */
export function getDaysSinceFirstOpen(): number {
  const firstOpen = storage.get<string>(FIRST_OPEN_KEY);
  if (!firstOpen) return 0;
  const diffMs = Date.now() - new Date(firstOpen).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Flush pending events (call when app backgrounds).
 */
export function flushAnalytics() {
  client?.flush();
}

// Core exports for FSD architecture
// This file provides convenient re-exports from FSD layers

// =============================================================================
// SHARED LAYER
// =============================================================================

// Types
export type { PaginatedResponse, ApiResponse, ThemeColors, BaseComponentProps, LoadingStateType } from "./shared/types";

// Config/Constants
export { CAMERA_SETTINGS, APP_CONFIG, API_CONFIG, STORAGE_KEYS, QUERY_KEYS, MUTATION_KEYS } from "./shared/config";

// Design System
export * from "./shared/ui";

// i18n
export { default as i18n } from "./shared/lib/i18n/config";
export { useI18n } from "./shared/lib/i18n";

// =============================================================================
// ENTITIES LAYER
// =============================================================================

export type { User, AuthCredential } from "./entities/user";
export { MealType } from "./entities/meal";
export type { NutritionInfo, AIAnalysis, CapturedPhoto, CameraSettings, Meal } from "./entities/meal";
export type { Location, Entry, EntryFilter, SortMethod, EntryStatistics } from "./entities/entry";

// =============================================================================
// FEATURES LAYER
// =============================================================================

export { useAuthStore, selectIsAuthenticated } from "./features/auth/model/authStore";
export { useSettingsStore, flushSettingsStorage } from "./features/settings/model/settingsStore";

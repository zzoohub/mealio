// Core exports for better tree-shaking and module resolution

// Common Types (always import types only)
export type { PaginatedResponse, ApiResponse, ThemeColors, BaseComponentProps, LoadingStateType } from "./types";

// Domain-specific Types
export type {
  User,
  LoginFormData,
  RegisterFormData,
  PhoneAuthFormData,
  VerificationFormData,
} from "./domains/auth/types";

export type {
  MealType,
  NutritionInfo,
  Location,
  AIAnalysis,
  CapturedPhoto,
  CameraSettings,
  Meal,
  Entry,
  EntryFilter,
} from "./domains/diary";

export type { AnalyticsEvent } from "./domains/analytics/types";

export type { UserPreferences } from "./domains/settings/types";

// Constants
export { CAMERA_SETTINGS, APP_CONFIG, API_CONFIG, STORAGE_KEYS, QUERY_KEYS, MUTATION_KEYS } from "./constants";

// Design System
export * from "./design-system";

// Components (organized by category)
export { LoadingState, ErrorState } from "./components";

// Domains (feature-based exports)
// Camera moved to orbital components
// export { TakePicture } from "./domains/posts";  // TODO: Implement posts domain
// export { usePosts } from "./domains/posts";    // TODO: Implement posts domain
export { useAuthStore } from "./domains/auth/stores/authStore";
export { useSettingsStore } from "./domains/settings/stores/settingsStore";

// Core libraries
export { default as i18n } from "./lib/i18n/config";
export { useI18n } from "./lib/i18n";

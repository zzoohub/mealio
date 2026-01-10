// App configuration constants
export const APP_CONFIG = {
  NAME: "Meal Log",
  VERSION: "1.0.0",
  BUILD_NUMBER: 1,
  API_VERSION: "v1",
} as const;

// API configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ ? "http://localhost:3000/api" : "https://api.mealio.app",
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;

// Storage keys for MMKV
export const STORAGE_KEYS = {
  USER_TOKEN: "user_token",
  USER_DATA: "user_data",
  LANGUAGE: "user_language",
  THEME: "user_theme",
  ONBOARDING_COMPLETED: "onboarding_completed",
  CAMERA_PERMISSIONS_REQUESTED: "camera_permissions_requested",
  RECENT_PHOTOS: "recent_photos",
  APP_SETTINGS: "app_settings",
  // Auth
  GOOGLE_AUTH_TOKEN: "google_auth_token",
  // Settings
  NOTIFICATION_SETTINGS: "notification_settings",
  PRIVACY_SETTINGS: "privacy_settings",
  DISPLAY_SETTINGS: "display_settings",
  GOAL_SETTINGS: "goal_settings",
  CAMERA_SETTINGS: "camera_settings",
} as const;

// Camera settings
export const CAMERA_SETTINGS = {
  DEFAULT_QUALITY: 0.8,
  MAX_PHOTOS_PER_POST: 5,
  PHOTO_COMPRESSION: 0.7,
  THUMBNAIL_SIZE: 150,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;

// Meal types
export const MEAL_TYPES = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACK: "snack",
} as const;

// Privacy settings
export const PRIVACY_LEVELS = {
  PUBLIC: "public",
  FRIENDS: "friends",
  PRIVATE: "private",
} as const;

// Regular expressions for validation
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  VERIFICATION_CODE: /^\d{6}$/,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network connection failed. Please check your internet connection.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  USER_NOT_FOUND: "User not found.",
  EMAIL_ALREADY_EXISTS: "Email address is already registered.",
  USERNAME_ALREADY_EXISTS: "Username is already taken.",
  // Google auth errors
  GOOGLE_SIGN_IN_FAILED: "Failed to sign in with Google. Please try again.",
  GOOGLE_SIGN_IN_CANCELLED: "Sign in was cancelled.",
  // General errors
  CAMERA_PERMISSION_DENIED: "Camera permission is required to take photos.",
  PHOTO_LIBRARY_PERMISSION_DENIED: "Photo library access is required to select photos.",
  PHOTO_CAPTURE_FAILED: "Failed to capture photo. Please try again.",
  UPLOAD_FAILED: "Failed to upload photo. Please try again.",
  GENERIC_ERROR: "Something went wrong. Please try again.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  PHOTO_CAPTURED: "Photo captured successfully!",
  POST_CREATED: "Post created successfully!",
  POST_UPDATED: "Post updated successfully!",
  POST_DELETED: "Post deleted successfully!",
  PROFILE_UPDATED: "Profile updated successfully!",
  PASSWORD_CHANGED: "Password changed successfully!",
  LOGIN_SUCCESS: "Welcome back!",
  LOGOUT_SUCCESS: "You have been logged out.",
} as const;

// Feature flags (for gradual rollouts)
export const FEATURE_FLAGS = {
  AI_FOOD_RECOGNITION: true,
  SOCIAL_FEATURES: true,
  LOCATION_TRACKING: true,
  PUSH_NOTIFICATIONS: true,
  ANALYTICS: !__DEV__, // Disable analytics in development
  CRASH_REPORTING: !__DEV__, // Disable crash reporting in development
} as const;

// Query keys for React Query
export const QUERY_KEYS = {
  POSTS: "posts",
  POST_DETAIL: "post-detail",
  USER_PROFILE: "user-profile",
  FEED: "feed",
  TIMELINE: "timeline",
  SEARCH: "search",
  NOTIFICATIONS: "notifications",
} as const;

// Mutation keys for React Query
export const MUTATION_KEYS = {
  CREATE_POST: "create-post",
  UPDATE_POST: "update-post",
  DELETE_POST: "delete-post",
  LIKE_POST: "like-post",
  UNLIKE_POST: "unlike-post",
  FOLLOW_USER: "follow-user",
  UNFOLLOW_USER: "unfollow-user",
  UPDATE_PROFILE: "update-profile",
} as const;

// Haptic feedback types (for iOS)
export const HAPTIC_TYPES = {
  LIGHT: "light",
  MEDIUM: "medium",
  HEAVY: "heavy",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
} as const;

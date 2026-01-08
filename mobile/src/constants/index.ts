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
  PHONE_AUTH_TOKEN: "phone_auth_token",
  LAST_PHONE_NUMBER: "last_phone_number",
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

// Animation durations (in milliseconds)
export const ANIMATION_DURATION = {
  SHORT: 200,
  MEDIUM: 300,
  LONG: 500,
  EXTRA_LONG: 1000,
} as const;

// UI constants
export const UI_CONSTANTS = {
  TAB_BAR_HEIGHT: 70,
  TAB_BAR_HEIGHT_IOS: 85,
  HEADER_HEIGHT: 56,
  SAFE_AREA_PADDING: 16,
  MIN_TOUCH_TARGET: 44,
  BORDER_WIDTH: 1,
} as const;

// Spacing values (following 8px grid system)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

// Border radius values
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// Font sizes
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Font weights
export const FONT_WEIGHTS = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

// Colors (brand colors)
export const BRAND_COLORS = {
  PRIMARY: "#FF6B35",
  PRIMARY_LIGHT: "#FF8A5B",
  PRIMARY_DARK: "#E55A2B",
  SECONDARY: "#4ECDC4",
  SUCCESS: "#2ECC71",
  WARNING: "#F39C12",
  ERROR: "#E74C3C",
  INFO: "#3498DB",
} as const;

// Light theme colors
export const LIGHT_THEME_COLORS = {
  primary: BRAND_COLORS.PRIMARY,
  secondary: BRAND_COLORS.SECONDARY,
  background: "#FFFFFF",
  surface: "#F8F9FA",
  text: "#1A1A1A",
  textSecondary: "#666666",
  border: "#E1E8ED",
  error: BRAND_COLORS.ERROR,
  success: BRAND_COLORS.SUCCESS,
  warning: BRAND_COLORS.WARNING,
} as const;

// Dark theme colors
export const DARK_THEME_COLORS = {
  primary: BRAND_COLORS.PRIMARY,
  secondary: BRAND_COLORS.SECONDARY,
  background: "#000000",
  surface: "rgba(255, 255, 255, 0.06)",
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  border: "#38383A",
  error: BRAND_COLORS.ERROR,
  success: BRAND_COLORS.SUCCESS,
  warning: BRAND_COLORS.WARNING,
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
  // Phone auth errors
  INVALID_PHONE_NUMBER: "Please enter a valid phone number.",
  INVALID_VERIFICATION_CODE: "Please enter a valid 6-digit code.",
  VERIFICATION_CODE_EXPIRED: "Verification code has expired. Please request a new one.",
  PHONE_ALREADY_EXISTS: "This phone number is already registered.",
  SMS_SEND_FAILED: "Failed to send verification code. Please try again.",
  SMS_VERIFICATION_FAILED: "Verification failed. Please check the code and try again.",
  TOO_MANY_ATTEMPTS: "Too many attempts. Please wait 15 minutes and try again.",
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
  // Phone auth success
  SMS_SENT: "Verification code sent!",
  PHONE_VERIFIED: "Phone number verified successfully!",
  LOGIN_SUCCESS: "Welcome back!",
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

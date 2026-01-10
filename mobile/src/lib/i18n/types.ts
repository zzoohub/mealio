/**
 * TypeScript definitions for i18n keys and namespaces
 * This provides compile-time type safety for translation keys
 */

// Base translation resources structure (modules with JSON files)
export interface TranslationResources {
  navigation: NavigationTranslations;
  camera: CameraTranslations;
  common: CommonTranslations;
  errors: ErrorTranslations;
  settings: SettingsTranslations;
  diary: DiaryTranslations;
}

// Navigation translations
export interface NavigationTranslations {
  camera: string;
  diary: string;
}

// Camera translations
export interface CameraTranslations {
  title: string;
  subtitle: string;
  quickHint: string;
  capturingText: string;
  preparing: string;
  flip: string;
  recent: string;
  done: string;
  tapToEdit: string;
  aiAnalysis: string;
  aiAnalysisDesc: string;
  welcome: {
    title: string;
    message: string;
    enableCamera: string;
  };
  permissions: {
    title: string;
    message: string;
    cancel: string;
    openSettings: string;
  };
  capture: {
    success: string;
    successMessage: string;
    viewTimeline: string;
    error: string;
    errorMessage: string;
  };
}

// Common translations
export interface CommonTranslations {
  loading: string;
  retry: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  ok: string;
  yes: string;
  no: string;
  calories: string;
  likes: string;
  settings: string;
  language: string;
  about: string;
}

// Error translations
export interface ErrorTranslations {
  networkError: string;
  genericError: string;
  cameraError: string;
  storageError: string;
}

// Diary translations
export interface DiaryTranslations {
  diaryHistory: string;
  searchPlaceholder: string;
  noMealsFound: string;
  loadMore: string;
  meals: string;
  today: string;
  yesterday: string;
  thisWeek: string;
  thisMonth: string;
  older: string;
  diary: string;
  recordMeal: string;
  goToToday: string;
  selectDate: string;
}

// Settings translations
export interface SettingsTranslations {
  title: string;
  language: {
    title: string;
    description: string;
    select: string;
  };
  notifications: {
    title: string;
    description: string;
  };
  privacy: {
    title: string;
    description: string;
  };
  about: {
    title: string;
    version: string;
    description: string;
  };
  display: {
    title: string;
    appearance: {
      title: string;
      description: string;
    };
    theme: {
      title: string;
      description: string;
      select: string;
      light: string;
      lightDesc: string;
      dark: string;
      darkDesc: string;
      system: string;
      systemDesc: string;
    };
    fontSize: {
      title: string;
      description: string;
      select: string;
      small: string;
      smallDesc: string;
      medium: string;
      mediumDesc: string;
      large: string;
      largeDesc: string;
    };
    languageRegion: {
      title: string;
      description: string;
    };
    language: {
      select: string;
    };
    units: {
      title: string;
      description: string;
      select: string;
      metric: string;
      metricDesc: string;
      imperial: string;
      imperialDesc: string;
    };
    content: {
      title: string;
      description: string;
    };
    nutrition: {
      title: string;
      description: string;
      select: string;
      detailed: string;
      detailedDesc: string;
      simple: string;
      simpleDesc: string;
    };
  };
}

// Type-safe translation key paths
export type TranslationKey =
  | `navigation.${keyof NavigationTranslations}`
  | `camera.${KeyPath<CameraTranslations>}`
  | `common.${keyof CommonTranslations}`
  | `errors.${keyof ErrorTranslations}`
  | `settings.${KeyPath<SettingsTranslations>}`
  | `diary.${keyof DiaryTranslations}`;

// Utility type for nested key paths
type KeyPath<T> = T extends object
  ? {
      [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${KeyPath<T[K]>}` : K) : never;
    }[keyof T]
  : never;

// Domain-specific key types for type safety in hooks
export type NavigationKeys = keyof NavigationTranslations;
export type CameraKeys = KeyPath<CameraTranslations>;
export type CommonKeys = keyof CommonTranslations;
export type ErrorKeys = keyof ErrorTranslations;
export type SettingsKeys = KeyPath<SettingsTranslations>;
export type DiaryKeys = keyof DiaryTranslations;

// Formatter function types
export interface FormattersType {
  calories: (count: number) => string;
  likes: (count: number) => string;
  number: (value: number) => string;
  currency: (value: number) => string;
  date: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  time: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  timeAgo: (date: Date) => string;
}

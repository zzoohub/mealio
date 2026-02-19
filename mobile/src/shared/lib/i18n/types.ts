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
  auth: AuthTranslations;
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
    guestLimitTitle: string;
    guestLimitMessage: string;
  };
}

// Auth translations
export interface AuthTranslations {
  welcomeTitle: string;
  welcomeSubtitle: string;
  continueWithApple: string;
  continueWithGoogle: string;
  termsFooter: string;
  syncLocalEntries: string;
  syncLocalEntriesMessage: string;
  syncLocalEntryMessage: string;
  skip: string;
  sync: string;
  migrationError: string;
  migrationErrorMessage: string;
  signInFailed: string;
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
  confirm: string;
  done: string;
  error: string;
  back: string;
  sort: string;
  clearAll: string;
  search: string;
  customSelect: string;
  mealTypeBreakfast: string;
  mealTypeLunch: string;
  mealTypeDinner: string;
  mealTypeSnack: string;
  mealTypeDessert: string;
  mealTypeDrink: string;
  mealTypeOther: string;
  mealTypeMeal: string;
  apply: string;
  user: string;
  signedIn: string;
  sortBy: string;
  uploading: string;
  uploadFailed: string;
  uploadFailedMessage: string;
  share: string;
  shareEntry: string;
}

// Error translations
export interface ErrorTranslations {
  networkError: string;
  genericError: string;
  cameraError: string;
  storageError: string;
  deleteFailed: string;
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
  loadFromAlbum: string;
  orSelectFromPhotos: string;
  goToToday: string;
  selectDate: string;
  sortNewest: string;
  sortOldest: string;
  sortHighestRated: string;
  nutritionCalories: string;
  nutritionProtein: string;
  nutritionFat: string;
  nutritionFiber: string;
  nutritionSugar: string;
  nutritionCarbs: string;
  nutritionSodium: string;
  aiAnalysis: string;
  editNutrition: string;
  editDone: string;
  ingredients: string;
  nutritionInfo: string;
  addIngredient: string;
  notesPlaceholder: string;
  notesInput: string;
  notesEmpty: string;
  notesAccessibility: string;
  wouldEatAgain: string;
  ratingPoints: string;
  deleteEntryTitle: string;
  deleteEntryMessage: string;
  searchNoResults: string;
  searchAdjustFilters: string;
  searchRecordPrompt: string;
  mealTypeSelect: string;
  mealTypeAccessibility: string;
  location: string;
  openInMaps: string;
  addNutrition: string;
  changeDateTime: string;
  maxPhotosReached: string;
  maxPhotosMessage: string;
  addPhotoFailed: string;
  selectDateRange: string;
  quickSelect: string;
  allTime: string;
  last7Days: string;
  last30Days: string;
  last3Months: string;
  calendarInstructions: string;
  clearSelection: string;
  deleteEntry: string;
  deleteEntryHint: string;
  deletingEntry: string;
  sortLatestFirst: string;
  sortLatestFirstDesc: string;
  sortOldestFirst: string;
  sortOldestFirstDesc: string;
  sortHighestCalories: string;
  sortHighestCaloriesDesc: string;
  sortLowestCalories: string;
  sortLowestCaloriesDesc: string;
  sortHighestProtein: string;
  sortHighestProteinDesc: string;
  sortLowestProtein: string;
  sortLowestProteinDesc: string;
  sortHealthiestFirst: string;
  sortHealthiestFirstDesc: string;
  sortLeastHealthy: string;
  sortLeastHealthyDesc: string;
  sortMostNutritious: string;
  sortMostNutritiousDesc: string;
  sortLeastDense: string;
  sortLeastDenseDesc: string;
  rangeLight: string;
  rangeModerate: string;
  rangeSubstantial: string;
  rangeLarge: string;
  rangeVeryLarge: string;
  rangeLowProtein: string;
  rangeModerateProtein: string;
  rangeHighProtein: string;
  rangeVeryHighProtein: string;
  rangeExcellent: string;
  rangeGood: string;
  rangeFair: string;
  rangePoor: string;
  rangeVeryDense: string;
  rangeDense: string;
  rangeModerateDensity: string;
  rangeLowDensity: string;
  allEntries: string;
  dateRangeFrom: string;
  dateRangeUntil: string;
  recentMeals: string;
  seeAll: string;
  loadingMeals: string;
  noMealsYet: string;
  aiAnalyzing: string;
  aiAnalysisFailed: string;
  aiRetry: string;
}

// Settings translations
export interface SettingsTranslations {
  title: string;
  account: {
    title: string;
    signIn: string;
    signInDescription: string;
    signOut: string;
    signOutDescription: string;
    deleteAccount: string;
    deleteAccountDescription: string;
  };
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
  | `diary.${keyof DiaryTranslations}`
  | `auth.${keyof AuthTranslations}`;

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
export type AuthKeys = keyof AuthTranslations;

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

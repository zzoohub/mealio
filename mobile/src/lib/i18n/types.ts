/**
 * TypeScript definitions for i18n keys and namespaces
 * This provides compile-time type safety for translation keys
 */

// Base translation resources structure
export interface TranslationResources {
  navigation: NavigationTranslations;
  camera: CameraTranslations;
  timeline: TimelineTranslations;
  discover: DiscoverTranslations;
  progress: ProgressTranslations;
  aiCoach: AICoachTranslations;
  mealDetail: MealDetailTranslations;
  common: CommonTranslations;
  errors: ErrorTranslations;
  settings: SettingsTranslations;
}

// Navigation translations
export interface NavigationTranslations {
  camera: string;
  timeline: string;
  discover: string;
}

// Camera translations
export interface CameraTranslations {
  title: string;
  subtitle: string;
  quickHint: string;
  capturingText: string;
  preparing: string;
  flip: string;
  discover: string;
  progress: string;
  aiCoach: string;
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

// Timeline translations
export interface TimelineTranslations {
  title: string;
  thisWeek: string;
  recentMeals: string;
  quickCapture: string;
  mealHistory: string;
  searchPlaceholder: string;
  selectDateRange: string;
  noMealsFound: string;
  noMealsMessage: string;
  startLogging: string;
  loadMore: string;
  cancel: string;
  apply: string;
  periods: {
    day: string;
    week: string;
    month: string;
  };
  dates: {
    today: string;
    yesterday: string;
  };
  mealTypes: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
  };
  stats: {
    meals: string;
    avgCalories: string;
    goalProgress: string;
  };
}

// Discover translations
export interface DiscoverTranslations {
  title: string;
  subtitle: string;
  categories: {
    all: string;
    healthy: string;
    quick: string;
    comfort: string;
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  social: {
    follow: string;
    following: string;
    timeAgo: {
      now: string;
      minute_one: string;
      minute_other: string;
      hour_one: string;
      hour_other: string;
      day_one: string;
      day_other: string;
    };
  };
}

// Progress translations
export interface ProgressTranslations {
  title: string;
  todaySummary: string;
  caloriesConsumed: string;
  remaining: string;
  macronutrients: string;
  protein: string;
  carbs: string;
  fat: string;
  water: string;
  fiber: string;
  achievements: string;
  weeklyTrends: string;
  day: string;
  week: string;
  month: string;
  proteinMaster: string;
  proteinMasterDesc: string;
  veggieWarrior: string;
  veggieWarriorDesc: string;
  consistencyKing: string;
  consistencyKingDesc: string;
  eatingPattern: string;
  seeAll: string;
  viewAll: string;
  balancedExplorer: string;
  balancedExplorerDesc: string;
  mealDiversityScore: string;
  diversityTip: string;
}

// AI Coach translations
export interface AICoachTranslations {
  title: string;
  greeting: string;
  typeMessage: string;
  send: string;
  insights: string;
  analyzeMy: string;
  setGoals: string;
  weeklyReport: string;
  mealSuggestions: string;
  proteinGoal: string;
  proteinGoalDesc: string;
  hydrationReminder: string;
  hydrationReminderDesc: string;
  vegetableVariety: string;
  vegetableVarietyDesc: string;
  subtitle: string;
  mealIdeas: string;
  goalCheck: string;
}

// Meal Detail translations
export interface MealDetailTranslations {
  title: string;
  editTitle: string;
  save: string;
  saved: string;
  analyzing: string;
  loadingMeal: string;
  analyzingSubtext: string;
  loadingSubtext: string;
  analysisFailed: string;
  tryAgain: string;
  goBack: string;
  confidence: string;
  nutritionFacts: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  ingredients: string;
  addIngredient: string;
  tapToEdit: string;
  aiRecommendations: string;
  noRecommendations: string;
  retakePhoto: string;
  sharePhoto: string;
  deletePhoto: string;
  mealSaved: string;
  failedToSave: string;
  failedToLoad: string;
  noMealId: string;
  mealNotFound: string;
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

// Settings translations (simplified for example)
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
  | `timeline.${KeyPath<TimelineTranslations>}`
  | `discover.${KeyPath<DiscoverTranslations>}`
  | `progress.${KeyPath<ProgressTranslations>}`
  | `aiCoach.${KeyPath<AICoachTranslations>}`
  | `mealDetail.${KeyPath<MealDetailTranslations>}`
  | `common.${keyof CommonTranslations}`
  | `errors.${keyof ErrorTranslations}`
  | `settings.${KeyPath<SettingsTranslations>}`;

// Utility type for nested key paths
type KeyPath<T> = T extends object
  ? {
      [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${KeyPath<T[K]>}` : K) : never;
    }[keyof T]
  : never;

// Domain-specific key types for type safety in hooks
export type NavigationKeys = keyof NavigationTranslations;
export type CameraKeys = KeyPath<CameraTranslations>;
export type TimelineKeys = KeyPath<TimelineTranslations>;
export type DiscoverKeys = KeyPath<DiscoverTranslations>;
export type ProgressKeys = KeyPath<ProgressTranslations>;
export type AICoachKeys = KeyPath<AICoachTranslations>;
export type MealDetailKeys = KeyPath<MealDetailTranslations>;
export type CommonKeys = keyof CommonTranslations;
export type ErrorKeys = keyof ErrorTranslations;
export type SettingsKeys = KeyPath<SettingsTranslations>;

// Meal types for type safety
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type CategoryType = "all" | "healthy" | "quick" | "comfort" | "breakfast" | "lunch" | "dinner";
export type PeriodType = "day" | "week" | "month";
export type StatType = "meals" | "avgCalories" | "goalProgress";

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

// Meal helpers function types
export interface MealHelpersType {
  mealType: (type: MealType) => string;
  category: (category: CategoryType) => string;
  period: (period: PeriodType) => string;
  stat: (stat: StatType) => string;
}

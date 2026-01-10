// Diary domain types
// Entry = diary entry (일기 항목)
// Meal = food data within an entry (식사 정보)

// =============================================================================
// ENUMS
// =============================================================================

export enum MealType {
  BREAKFAST = "breakfast",
  LUNCH = "lunch",
  DINNER = "dinner",
  SNACK = "snack",
}

// =============================================================================
// NUTRITION & AI
// =============================================================================

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  water?: number;
}

export interface AIAnalysis {
  detectedMeals: string[];
  confidence: number;
  estimatedCalories: number;
  mealCategory: MealType;
  ingredients: string[];
  cuisineType?: string;
  /** AI가 생성한 한줄평 (위트있는 코멘트) */
  comment?: string;
  insights?: {
    healthScore: number;
    nutritionBalance: string;
    recommendations: string[];
    warnings?: string[];
  };
}

// =============================================================================
// LOCATION
// =============================================================================

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  restaurantName?: string;
}

// =============================================================================
// MEAL (식사 정보)
// =============================================================================

export interface Meal {
  photoUri: string;
  mealType: MealType;
  nutrition?: NutritionInfo;
  ingredients?: string[];
  aiAnalysis?: AIAnalysis;
  isVerified?: boolean;
}

// =============================================================================
// ENTRY (일기 항목)
// =============================================================================

export interface Entry {
  id: string;
  userId: string;
  timestamp: Date;
  notes: string;
  location?: Location;
  meal: Meal;
  /** 만족도 (1-5) */
  rating?: number;
  /** 다시 먹고 싶어요 */
  wouldEatAgain?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// SORTING
// =============================================================================

export type SortMethod =
  | "date-desc"
  | "date-asc"
  | "calories-desc"
  | "calories-asc"
  | "protein-desc"
  | "protein-asc"
  | "health-score-desc"
  | "health-score-asc"
  | "nutrition-density-desc"
  | "nutrition-density-asc";

// =============================================================================
// FILTERS & STATISTICS
// =============================================================================

export interface EntryFilter {
  startDate?: Date;
  endDate?: Date;
  mealType?: MealType;
  searchQuery?: string;
}

export interface EntryStatistics {
  totalEntries: number;
  averageCalories: number;
  averageNutrition: NutritionInfo;
  topIngredients: { name: string; count: number }[];
  mealTypeDistribution: Record<MealType, number>;
}

// =============================================================================
// CAMERA & MEDIA
// =============================================================================

export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  exif?: Record<string, unknown>;
}

export interface CameraSettings {
  type: "front" | "back";
  flash: "on" | "off" | "auto";
  quality: number;
}


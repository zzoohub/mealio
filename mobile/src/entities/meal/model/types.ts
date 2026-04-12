// Meal entity types
// Business entity representing food/meal data

// =============================================================================
// ENUMS
// =============================================================================

export enum MealType {
  BREAKFAST = "breakfast",
  LUNCH = "lunch",
  DINNER = "dinner",
  SNACK = "snack",
  DESSERT = "dessert",
  DRINK = "drink",
  OTHER = "other",
}

// =============================================================================
// MEAL TYPE ICONS (Ionicons names)
// =============================================================================

export const MEAL_TYPE_ICONS: Record<string, string> = {
  [MealType.BREAKFAST]: "sunny-outline",
  [MealType.LUNCH]: "sunny",
  [MealType.DINNER]: "moon-outline",
  [MealType.SNACK]: "nutrition-outline",
  [MealType.DESSERT]: "ice-cream-outline",
  [MealType.DRINK]: "cafe-outline",
  [MealType.OTHER]: "ellipsis-horizontal-circle-outline",
};

const DEFAULT_MEAL_TYPE_ICON = "restaurant-outline";

export function getMealTypeIcon(mealType: string): string {
  return MEAL_TYPE_ICONS[mealType.toLowerCase()] ?? DEFAULT_MEAL_TYPE_ICON;
}

// =============================================================================
// NUTRITION & AI
// =============================================================================

export interface NutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface AIAnalysis {
  detectedMeals: string[];
  confidence: number;
  /** AI가 추정한 영양 정보 */
  nutrition: NutritionInfo;
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
// MEAL (식사 정보)
// =============================================================================

export interface Meal {
  photoUri: string;
  /** All photo URIs sorted by sort_order (includes primary) */
  photoUris?: string[];
  mealType: MealType;
  nutrition?: NutritionInfo;
  ingredients?: string[];
  aiAnalysis?: AIAnalysis;
  isVerified?: boolean;
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

// Entry entity types
// Business entity representing a diary entry

import type { Meal, MealType } from "@/entities/meal";

// =============================================================================
// LOCATION
// =============================================================================

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
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
  averageNutrition: import("@/entities/meal").NutritionInfo;
  topIngredients: { name: string; count: number }[];
  mealTypeDistribution: Record<MealType, number>;
}

// Meal and nutrition related types

// Enums first to avoid circular references
export enum MealType {
  BREAKFAST = "breakfast",
  LUNCH = "lunch",
  DINNER = "dinner",
  SNACK = "snack",
}

export enum PostPrivacy {
  PUBLIC = "public",
  FRIENDS = "friends",
  PRIVATE = "private",
}

// Interfaces
export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  water?: number; // Added for compatibility with stats aggregation
}

export interface AIAnalysis {
  detectedMeals: string[];
  confidence: number;
  estimatedCalories: number;
  mealCategory: MealType;
  ingredients: string[];
  cuisineType?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  restaurantName?: string;
}

export interface PostFormData {
  content: string;
  images: string[];
  mealType?: MealType;
  privacy: PostPrivacy;
  location?: Location;
}

// Camera and media types for meal capture
export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  exif?: any;
}

export interface CameraSettings {
  type: "front" | "back";
  flash: "on" | "off" | "auto";
  quality: number;
}

export interface Meal {
  id: string;
  userId: string;
  name: string;
  photoUri: string;
  timestamp: Date;
  mealType: MealType;
  nutrition: NutritionInfo;
  ingredients: string[];
  aiAnalysis: AIAnalysisWithInsights;
  location: Location;
  notes: string;
  isVerified: boolean; // true if user has edited/verified the AI results
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAnalysisWithInsights extends AIAnalysis {
  insights?: {
    healthScore: number; // 0-100
    nutritionBalance: string; // e.g., "High protein, moderate carbs"
    recommendations: string[];
    warnings?: string[]; // e.g., "High sodium content"
  };
}

export interface MealHistoryFilter {
  startDate?: Date;
  endDate?: Date;
  mealType?: MealType;
  searchQuery?: string;
}

export interface MealStatistics {
  totalMeals: number;
  averageCalories: number;
  averageNutrition: NutritionInfo;
  topIngredients: { name: string; count: number }[];
  mealTypeDistribution: Record<MealType, number>;
}

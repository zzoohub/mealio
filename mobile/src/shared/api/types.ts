// API wire types — match Rust API response shapes exactly

// =============================================================================
// COMMON
// =============================================================================

export interface ApiPaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: ApiPaginationMeta;
}

/** RFC 9457 Problem Detail */
export interface ApiProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
}

export type ApiMealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "dessert"
  | "drink"
  | "other";

// =============================================================================
// AUTH
// =============================================================================

export interface ApiSignInRequest {
  provider: string;
  id_token: string;
  device_info?: string;
}

export interface ApiUserInfo {
  id: number;
  display_name: string;
  email: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: ApiUserInfo;
}

export interface ApiRefreshRequest {
  refresh_token: string;
}

export interface ApiRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface ApiRevokeRequest {
  refresh_token: string;
}

// =============================================================================
// USER
// =============================================================================

export interface ApiUser {
  id: number;
  display_name: string;
  email: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ApiUpdateUserRequest {
  display_name?: string;
  photo_url?: string;
}

export interface ApiUserSettings {
  id: number;
  user_id: number;
  theme: string;
  language: string;
  notifications_enabled: boolean;
  privacy_profile_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiUpdateSettingsRequest {
  theme?: string;
  language?: string;
  notifications_enabled?: boolean;
  privacy_profile_public?: boolean;
}

// =============================================================================
// DIARY
// =============================================================================

export interface ApiDiaryEntry {
  id: number;
  user_id: number;
  meal_type: ApiMealType;
  title: string;
  notes: string | null;
  eaten_at: string;
  created_at: string;
  updated_at: string;
  primary_photo_url: string | null;
  photo_urls?: string[];
  rating: number | null;
  would_eat_again: boolean | null;
}

export interface ApiEntryLocation {
  id: number;
  entry_id: number;
  name: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
}

export interface ApiEntryPhoto {
  id: number;
  entry_id: number;
  url: string;
  caption: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ApiUserNutrition {
  id: number;
  entry_id: number;
  calories: string | null;
  protein_grams: string | null;
  fat_grams: string | null;
  carbs_grams: string | null;
  fiber_grams: string | null;
  sugar_grams: string | null;
  sodium_mg: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiAiAnalysis {
  id: number;
  entry_id: number;
  calories: string | null;
  protein_grams: string | null;
  fat_grams: string | null;
  carbs_grams: string | null;
  fiber_grams: string | null;
  sugar_grams: string | null;
  sodium_mg: string | null;
  description: string | null;
  confidence_score: string | null;
  raw_response: unknown;
  created_at: string;
}

export interface ApiDiaryEntryDetail {
  id: number;
  user_id: number;
  meal_type: ApiMealType;
  title: string;
  notes: string | null;
  eaten_at: string;
  created_at: string;
  updated_at: string;
  rating: number | null;
  would_eat_again: boolean | null;
  location: ApiEntryLocation | null;
  photos: ApiEntryPhoto[];
  nutrition: ApiUserNutrition | null;
  ingredients: ApiEntryIngredientWithName[];
}

export interface ApiCreateEntryRequest {
  meal_type: ApiMealType;
  title: string;
  notes?: string;
  eaten_at?: string;
  location?: ApiCreateLocationInput;
}

export interface ApiCreateLocationInput {
  name?: string;
  address?: string;
  latitude: number;
  longitude: number;
}

export interface ApiUpdateEntryRequest {
  meal_type?: ApiMealType;
  title?: string;
  notes?: string;
  eaten_at?: string;
  rating?: number;
  would_eat_again?: boolean;
}

export interface ApiUpsertLocationRequest {
  name?: string;
  address?: string;
  latitude: number;
  longitude: number;
}

// =============================================================================
// UPLOADS
// =============================================================================

export interface ApiPresignRequest {
  content_type: string;
}

export interface ApiPresignResponse {
  upload_url: string;
  object_key: string;
  public_url: string;
  expires_in: number;
}

// =============================================================================
// PHOTOS
// =============================================================================

export interface ApiCreatePhotoRequest {
  url: string;
  caption?: string;
  is_primary?: boolean;
  sort_order?: number;
}

export interface ApiUpdatePhotoRequest {
  caption?: string;
  sort_order?: number;
}

// =============================================================================
// NUTRITION
// =============================================================================

export interface ApiUpsertNutritionRequest {
  calories?: string;
  protein_grams?: string;
  fat_grams?: string;
  carbs_grams?: string;
  fiber_grams?: string;
  sugar_grams?: string;
  sodium_mg?: string;
}

// =============================================================================
// INGREDIENTS
// =============================================================================

export interface ApiIngredient {
  id: number;
  name: string;
  category: string | null;
  created_at: string;
}

export interface ApiEntryIngredientWithName {
  id: number;
  entry_id: number;
  ingredient_id: number;
  ingredient_name: string;
  amount: string | null;
  unit: string | null;
  created_at: string;
}

export interface ApiLinkIngredientRequest {
  ingredient_id: number;
  amount?: string;
  unit?: string;
}

export interface ApiSyncIngredientsRequest {
  ingredients: ApiLinkIngredientRequest[];
}

// =============================================================================
// STATISTICS
// =============================================================================

export interface ApiNutritionStats {
  total_entries: number;
  avg_calories: string | null;
  total_calories: string | null;
  avg_protein: string | null;
  total_protein: string | null;
  avg_fat: string | null;
  total_fat: string | null;
  avg_sugar: string | null;
  total_sugar: string | null;
  avg_carbs: string | null;
  total_carbs: string | null;
  avg_fiber: string | null;
  total_fiber: string | null;
  avg_sodium: string | null;
  total_sodium: string | null;
}

export interface ApiMealTypeCount {
  meal_type: ApiMealType;
  count: number;
}

export interface ApiTopIngredient {
  ingredient_id: number;
  ingredient_name: string;
  usage_count: number;
}

export interface ApiOverview {
  nutrition: ApiNutritionStats;
  meal_types: ApiMealTypeCount[];
  top_ingredients: ApiTopIngredient[];
}

// =============================================================================
// AI ANALYSIS
// =============================================================================

export interface ApiCreateAnalysisRequest {
  calories?: string;
  protein_grams?: string;
  fat_grams?: string;
  carbs_grams?: string;
  fiber_grams?: string;
  sugar_grams?: string;
  sodium_mg?: string;
  description?: string;
  confidence_score?: string;
  raw_response?: unknown;
}

// =============================================================================
// QUERY PARAMS
// =============================================================================

export interface ApiDiaryQueryParams {
  page?: number;
  per_page?: number;
  start_date?: string;
  end_date?: string;
  meal_type?: ApiMealType;
  q?: string;
  tz?: string;
  order_by?: "eaten_at_desc" | "eaten_at_asc" | "rating_desc";
  would_eat_again?: boolean;
}

export interface ApiStatsParams {
  start_date?: string;
  end_date?: string;
}

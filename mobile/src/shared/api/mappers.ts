import type { User } from "@/entities/user";
import type { Entry, Location } from "@/entities/entry";
import { MealType, type NutritionInfo, type Meal } from "@/entities/meal";
import type {
  ApiUserInfo,
  ApiUser,
  ApiDiaryEntryDetail,
  ApiUserNutrition,
  ApiUpsertNutritionRequest,
  ApiMealType,
  ApiCreateEntryRequest,
  ApiUpdateEntryRequest,
} from "./types";

// =============================================================================
// HELPERS
// =============================================================================

function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

export function apiMealTypeToEnum(apiType: ApiMealType): MealType {
  const map: Record<ApiMealType, MealType> = {
    breakfast: MealType.BREAKFAST,
    lunch: MealType.LUNCH,
    dinner: MealType.DINNER,
    snack: MealType.SNACK,
    dessert: MealType.DESSERT,
    drink: MealType.DRINK,
    other: MealType.OTHER,
  };
  return map[apiType] ?? MealType.OTHER;
}

function enumToApiMealType(mealType: MealType): ApiMealType {
  return mealType as ApiMealType;
}

// =============================================================================
// USER MAPPERS
// =============================================================================

export function mapApiUserInfoToUser(apiUser: ApiUserInfo, provider?: string): User {
  return {
    id: String(apiUser.id),
    email: apiUser.email,
    name: apiUser.display_name || null,
    photo: apiUser.photo_url,
    provider: (provider as User["provider"]) ?? "google",
  };
}

export function mapApiUserToUser(apiUser: ApiUser, provider?: string): User {
  return {
    id: String(apiUser.id),
    email: apiUser.email,
    name: apiUser.display_name || null,
    photo: apiUser.photo_url,
    provider: (provider as User["provider"]) ?? "google",
  };
}

// =============================================================================
// NUTRITION MAPPERS
// =============================================================================

export function mapApiNutritionToNutritionInfo(
  n: ApiUserNutrition | null | undefined,
): NutritionInfo | undefined {
  if (!n) return undefined;

  return {
    calories: parseDecimal(n.calories),
    protein: parseDecimal(n.protein_grams),
    fat: parseDecimal(n.fat_grams),
    carbs: parseDecimal(n.carbs_grams),
    fiber: parseDecimal(n.fiber_grams),
    sugar: parseDecimal(n.sugar_grams),
    sodium: parseDecimal(n.sodium_mg),
  };
}

export function mapNutritionInfoToUpsertRequest(
  nutrition: NutritionInfo,
): ApiUpsertNutritionRequest {
  return {
    calories: String(nutrition.calories ?? 0),
    protein_grams: String(nutrition.protein ?? 0),
    fat_grams: String(nutrition.fat ?? 0),
    carbs_grams: String(nutrition.carbs ?? 0),
    fiber_grams: String(nutrition.fiber ?? 0),
    sugar_grams: String(nutrition.sugar ?? 0),
    sodium_mg: String(nutrition.sodium ?? 0),
  };
}

// =============================================================================
// DIARY ENTRY MAPPERS
// =============================================================================

export function mapApiDiaryEntryDetailToEntry(detail: ApiDiaryEntryDetail): Entry {
  const primaryPhoto = detail.photos.find((p) => p.is_primary) ?? detail.photos[0];
  const sortedPhotos = [...detail.photos].sort((a, b) => a.sort_order - b.sort_order);
  const allPhotoUris = sortedPhotos.map((p) => p.url);

  let location: Location | undefined;
  if (detail.location) {
    const loc: Location = {
      latitude: detail.location.latitude,
      longitude: detail.location.longitude,
    };
    if (detail.location.address) {
      loc.address = detail.location.address;
    }
    location = loc;
  }

  const meal: Meal = {
    photoUri: primaryPhoto?.url ?? "",
    photoUris: allPhotoUris.length > 0 ? allPhotoUris : undefined,
    mealType: apiMealTypeToEnum(detail.meal_type),
  };
  const nutrition = mapApiNutritionToNutritionInfo(detail.nutrition);
  if (nutrition) {
    meal.nutrition = nutrition;
  }
  if (detail.ingredients && detail.ingredients.length > 0) {
    meal.ingredients = detail.ingredients.map((i) => i.ingredient_name);
  }

  const entry: Entry = {
    id: String(detail.id),
    userId: String(detail.user_id),
    timestamp: new Date(detail.eaten_at),
    notes: detail.notes ?? "",
    meal,
    createdAt: new Date(detail.created_at),
    updatedAt: new Date(detail.updated_at),
  };

  if (detail.rating != null) {
    entry.rating = detail.rating;
  }
  if (detail.would_eat_again != null) {
    entry.wouldEatAgain = detail.would_eat_again;
  }

  if (location) {
    entry.location = location;
  }

  return entry;
}

export function mapEntryToCreateRequest(
  entry: Omit<Entry, "id" | "createdAt" | "updatedAt">,
): ApiCreateEntryRequest {
  const req: ApiCreateEntryRequest = {
    meal_type: enumToApiMealType(entry.meal.mealType),
  };

  if (entry.notes) {
    req.notes = entry.notes;
  }

  req.eaten_at = entry.timestamp.toISOString();

  if (entry.location) {
    req.location = {
      latitude: entry.location.latitude,
      longitude: entry.location.longitude,
    };
    if (entry.location.address) {
      req.location.address = entry.location.address;
    }
  }

  return req;
}

export function mapEntryToUpdateRequest(
  updates: Partial<Omit<Entry, "id" | "createdAt">>,
): ApiUpdateEntryRequest {
  const req: ApiUpdateEntryRequest = {};

  if (updates.meal?.mealType) {
    req.meal_type = enumToApiMealType(updates.meal.mealType);
  }
  if (updates.notes !== undefined) {
    req.notes = updates.notes;
  }
  if (updates.timestamp) {
    req.eaten_at = updates.timestamp.toISOString();
  }
  if (updates.rating !== undefined) {
    req.rating = updates.rating;
  }
  if (updates.wouldEatAgain !== undefined) {
    req.would_eat_again = updates.wouldEatAgain;
  }

  return req;
}

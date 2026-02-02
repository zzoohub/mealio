import type { User } from "@/entities/user";
import type { Entry, Location } from "@/entities/entry";
import { MealType, type NutritionInfo, type Meal } from "@/entities/meal";
import type {
  ApiUserInfo,
  ApiUser,
  ApiDiaryEntryDetail,
  ApiUserNutrition,
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

function parseOptionalDecimal(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value);
  return isNaN(n) ? undefined : n || undefined;
}

function apiMealTypeToEnum(apiType: ApiMealType): MealType {
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

  const info: NutritionInfo = {
    calories: parseDecimal(n.calories),
    protein: parseDecimal(n.protein_grams),
    fat: parseDecimal(n.fat_grams),
    sugar: parseDecimal(n.sugar_grams),
  };

  const fiber = parseOptionalDecimal(n.fiber_grams);
  if (fiber !== undefined) info.fiber = fiber;

  const sodium = parseOptionalDecimal(n.sodium_mg);
  if (sodium !== undefined) info.sodium = sodium;

  return info;
}

// =============================================================================
// DIARY ENTRY MAPPERS
// =============================================================================

export function mapApiDiaryEntryDetailToEntry(detail: ApiDiaryEntryDetail): Entry {
  const primaryPhoto = detail.photos.find((p) => p.is_primary) ?? detail.photos[0];

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
    mealType: apiMealTypeToEnum(detail.meal_type),
  };
  const nutrition = mapApiNutritionToNutritionInfo(detail.nutrition);
  if (nutrition) {
    meal.nutrition = nutrition;
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
    title: entry.notes || entry.meal.mealType,
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
    const title = updates.notes || updates.meal?.mealType;
    if (title) req.title = title;
    req.notes = updates.notes;
  }
  if (updates.timestamp) {
    req.eaten_at = updates.timestamp.toISOString();
  }

  return req;
}

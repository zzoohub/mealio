// Mock entity barrels to avoid pulling in RN UI components
jest.mock("@/entities/meal", () => ({
  MealType: {
    BREAKFAST: "breakfast",
    LUNCH: "lunch",
    DINNER: "dinner",
    SNACK: "snack",
    DESSERT: "dessert",
    DRINK: "drink",
    OTHER: "other",
  },
}));
jest.mock("@/entities/user", () => ({}));
jest.mock("@/entities/entry", () => ({}));

import {
  mapApiUserInfoToUser,
  mapApiUserToUser,
  mapApiNutritionToNutritionInfo,
  mapNutritionInfoToUpsertRequest,
  mapApiDiaryEntryDetailToEntry,
  mapEntryToCreateRequest,
  mapEntryToUpdateRequest,
  mapApiAiAnalysisToAIAnalysis,
} from "../mappers";
import type {
  ApiUserInfo,
  ApiUser,
  ApiUserNutrition,
  ApiDiaryEntryDetail,
  ApiEntryPhoto,
  ApiAiAnalysis,
  ApiEntryLocation,
} from "../types";
import type { Entry } from "@/entities/entry";
import type { NutritionInfo } from "@/entities/meal";
import { MealType } from "@/entities/meal";

// =============================================================================
// User Mappers
// =============================================================================

describe("mapApiUserInfoToUser", () => {
  it("maps ApiUserInfo to User with all fields", () => {
    const apiUser: ApiUserInfo = {
      id: 123,
      email: "test@example.com",
      display_name: "Test User",
      photo_url: "https://example.com/photo.jpg",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = mapApiUserInfoToUser(apiUser, "google");

    expect(result).toEqual({
      id: "123",
      email: "test@example.com",
      name: "Test User",
      photo: "https://example.com/photo.jpg",
      provider: "google",
    });
  });

  it("handles null photo_url", () => {
    const apiUser: ApiUserInfo = {
      id: 123,
      email: "test@example.com",
      display_name: "Test User",
      photo_url: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = mapApiUserInfoToUser(apiUser);

    expect(result.photo).toBeNull();
  });

  it("defaults provider to google when not provided", () => {
    const apiUser: ApiUserInfo = {
      id: 123,
      email: "test@example.com",
      display_name: "Test User",
      photo_url: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = mapApiUserInfoToUser(apiUser);

    expect(result.provider).toBe("google");
  });

  it("handles empty display_name as null", () => {
    const apiUser: ApiUserInfo = {
      id: 123,
      email: "test@example.com",
      display_name: "",
      photo_url: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = mapApiUserInfoToUser(apiUser);

    expect(result.name).toBeNull();
  });
});

describe("mapApiUserToUser", () => {
  it("maps ApiUser to User with all fields", () => {
    const apiUser: ApiUser = {
      id: 456,
      email: "user@example.com",
      display_name: "Another User",
      photo_url: "https://example.com/avatar.jpg",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      deleted_at: null,
    };

    const result = mapApiUserToUser(apiUser, "apple");

    expect(result).toEqual({
      id: "456",
      email: "user@example.com",
      name: "Another User",
      photo: "https://example.com/avatar.jpg",
      provider: "apple",
    });
  });

  it("handles null photo_url", () => {
    const apiUser: ApiUser = {
      id: 456,
      email: "user@example.com",
      display_name: "Another User",
      photo_url: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      deleted_at: null,
    };

    const result = mapApiUserToUser(apiUser);

    expect(result.photo).toBeNull();
  });

  it("defaults provider to google when not provided", () => {
    const apiUser: ApiUser = {
      id: 456,
      email: "user@example.com",
      display_name: "Another User",
      photo_url: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      deleted_at: null,
    };

    const result = mapApiUserToUser(apiUser);

    expect(result.provider).toBe("google");
  });
});

// =============================================================================
// Nutrition Mappers
// =============================================================================

describe("mapApiNutritionToNutritionInfo", () => {
  it("maps ApiUserNutrition to NutritionInfo with all fields", () => {
    const apiNutrition: ApiUserNutrition = {
      id: 1,
      entry_id: 100,
      calories: "500.5",
      protein_grams: "25.3",
      fat_grams: "15.7",
      carbs_grams: "60.2",
      fiber_grams: "8.1",
      sugar_grams: "12.5",
      sodium_mg: "450.8",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = mapApiNutritionToNutritionInfo(apiNutrition);

    expect(result).toEqual({
      calories: 500.5,
      protein: 25.3,
      fat: 15.7,
      carbs: 60.2,
      fiber: 8.1,
      sugar: 12.5,
      sodium: 450.8,
    });
  });

  it("handles null nutrition values as 0", () => {
    const apiNutrition: ApiUserNutrition = {
      id: 1,
      entry_id: 100,
      calories: null,
      protein_grams: null,
      fat_grams: null,
      carbs_grams: null,
      fiber_grams: null,
      sugar_grams: null,
      sodium_mg: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = mapApiNutritionToNutritionInfo(apiNutrition);

    expect(result).toEqual({
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    });
  });

  it("returns undefined when nutrition is null", () => {
    const result = mapApiNutritionToNutritionInfo(null);
    expect(result).toBeUndefined();
  });

  it("returns undefined when nutrition is undefined", () => {
    const result = mapApiNutritionToNutritionInfo(undefined);
    expect(result).toBeUndefined();
  });

  it("handles invalid number strings as 0", () => {
    const apiNutrition: ApiUserNutrition = {
      id: 1,
      entry_id: 100,
      calories: "invalid",
      protein_grams: "not-a-number",
      fat_grams: "",
      carbs_grams: "60.2",
      fiber_grams: null,
      sugar_grams: "12.5",
      sodium_mg: "NaN",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = mapApiNutritionToNutritionInfo(apiNutrition);

    expect(result).toEqual({
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 60.2,
      fiber: 0,
      sugar: 12.5,
      sodium: 0,
    });
  });
});

describe("mapNutritionInfoToUpsertRequest", () => {
  it("maps NutritionInfo to ApiUpsertNutritionRequest", () => {
    const nutrition: NutritionInfo = {
      calories: 500.5,
      protein: 25.3,
      fat: 15.7,
      carbs: 60.2,
      fiber: 8.1,
      sugar: 12.5,
      sodium: 450.8,
    };

    const result = mapNutritionInfoToUpsertRequest(nutrition);

    expect(result).toEqual({
      calories: "500.5",
      protein_grams: "25.3",
      fat_grams: "15.7",
      carbs_grams: "60.2",
      fiber_grams: "8.1",
      sugar_grams: "12.5",
      sodium_mg: "450.8",
    });
  });

  it("handles zero values", () => {
    const nutrition: NutritionInfo = {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    };

    const result = mapNutritionInfoToUpsertRequest(nutrition);

    expect(result).toEqual({
      calories: "0",
      protein_grams: "0",
      fat_grams: "0",
      carbs_grams: "0",
      fiber_grams: "0",
      sugar_grams: "0",
      sodium_mg: "0",
    });
  });
});

// =============================================================================
// Diary Entry Mappers
// =============================================================================

describe("mapApiDiaryEntryDetailToEntry", () => {
  it("maps ApiDiaryEntryDetail to Entry with all fields", () => {
    const photos: ApiEntryPhoto[] = [
      {
        id: 1,
        entry_id: 100,
        url: "https://example.com/photo1.jpg",
        caption: null,
        is_primary: true,
        sort_order: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        entry_id: 100,
        url: "https://example.com/photo2.jpg",
        caption: null,
        is_primary: false,
        sort_order: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    const location: ApiEntryLocation = {
      id: 1,
      entry_id: 100,
      name: null,
      address: "123 Main St",
      latitude: 37.7749,
      longitude: -122.4194,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const nutrition: ApiUserNutrition = {
      id: 1,
      entry_id: 100,
      calories: "500",
      protein_grams: "25",
      fat_grams: "15",
      carbs_grams: "60",
      fiber_grams: "8",
      sugar_grams: "12",
      sodium_mg: "450",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "breakfast",
      notes: "Delicious meal",
      eaten_at: "2024-01-01T08:00:00Z",
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      rating: null,
      would_eat_again: null,
      location,
      photos,
      nutrition,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.id).toBe("100");
    expect(result.userId).toBe("1");
    expect(result.timestamp).toEqual(new Date("2024-01-01T08:00:00Z"));
    expect(result.notes).toBe("Delicious meal");
    expect(result.meal.photoUri).toBe("https://example.com/photo1.jpg");
    expect(result.meal.photoUris).toEqual([
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
    ]);
    expect(result.meal.mealType).toBe(MealType.BREAKFAST);
    expect(result.meal.nutrition).toEqual({
      calories: 500,
      protein: 25,
      fat: 15,
      carbs: 60,
      fiber: 8,
      sugar: 12,
      sodium: 450,
    });
    expect(result.location).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      address: "123 Main St",
    });
  });

  it("sorts photos by sort_order", () => {
    const photos: ApiEntryPhoto[] = [
      {
        id: 3,
        entry_id: 100,
        url: "https://example.com/photo3.jpg",
        caption: null,
        is_primary: false,
        sort_order: 2,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 1,
        entry_id: 100,
        url: "https://example.com/photo1.jpg",
        caption: null,
        is_primary: true,
        sort_order: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        entry_id: 100,
        url: "https://example.com/photo2.jpg",
        caption: null,
        is_primary: false,
        sort_order: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "lunch",
      notes: null,
      eaten_at: "2024-01-01T12:00:00Z",
      created_at: "2024-01-01T12:00:00Z",
      updated_at: "2024-01-01T12:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos,
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.meal.photoUris).toEqual([
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
      "https://example.com/photo3.jpg",
    ]);
  });

  it("uses first photo as primary when no is_primary flag", () => {
    const photos: ApiEntryPhoto[] = [
      {
        id: 1,
        entry_id: 100,
        url: "https://example.com/photo1.jpg",
        caption: null,
        is_primary: false,
        sort_order: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        entry_id: 100,
        url: "https://example.com/photo2.jpg",
        caption: null,
        is_primary: false,
        sort_order: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "dinner",
      notes: null,
      eaten_at: "2024-01-01T18:00:00Z",
      created_at: "2024-01-01T18:00:00Z",
      updated_at: "2024-01-01T18:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos,
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.meal.photoUri).toBe("https://example.com/photo1.jpg");
  });

  it("handles empty photos array", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "snack",
      notes: null,
      eaten_at: "2024-01-01T15:00:00Z",
      created_at: "2024-01-01T15:00:00Z",
      updated_at: "2024-01-01T15:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.meal.photoUri).toBe("");
    expect(result.meal.photoUris).toBeUndefined();
  });

  it("sets photoUris to undefined when no photos", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "snack",
      notes: null,
      eaten_at: "2024-01-01T15:00:00Z",
      created_at: "2024-01-01T15:00:00Z",
      updated_at: "2024-01-01T15:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.meal.photoUris).toBeUndefined();
  });

  it("handles null notes", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "lunch",
      notes: null,
      eaten_at: "2024-01-01T12:00:00Z",
      created_at: "2024-01-01T12:00:00Z",
      updated_at: "2024-01-01T12:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.notes).toBe("");
  });

  it("handles location without address", () => {
    const location: ApiEntryLocation = {
      id: 1,
      entry_id: 100,
      name: null,
      address: null,
      latitude: 37.7749,
      longitude: -122.4194,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "dinner",
      notes: null,
      eaten_at: "2024-01-01T18:00:00Z",
      created_at: "2024-01-01T18:00:00Z",
      updated_at: "2024-01-01T18:00:00Z",
      rating: null,
      would_eat_again: null,
      location,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.location).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
    });
  });

  it("handles null location", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "breakfast",
      notes: null,
      eaten_at: "2024-01-01T08:00:00Z",
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.location).toBeUndefined();
  });

  it("handles null nutrition", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "breakfast",
      notes: null,
      eaten_at: "2024-01-01T08:00:00Z",
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.meal.nutrition).toBeUndefined();
  });

  it("maps all meal types correctly", () => {
    const mealTypes = [
      "breakfast",
      "lunch",
      "dinner",
      "snack",
      "dessert",
      "drink",
      "other",
    ] as const;

    mealTypes.forEach((mealType) => {
      const detail: ApiDiaryEntryDetail = {
        id: 100,
        user_id: 1,
        meal_type: mealType,
        notes: null,
        eaten_at: "2024-01-01T12:00:00Z",
        created_at: "2024-01-01T12:00:00Z",
        updated_at: "2024-01-01T12:00:00Z",
        rating: null,
        would_eat_again: null,
        location: null,
        photos: [],
        nutrition: null,
        ingredients: [],
      };

      const result = mapApiDiaryEntryDetailToEntry(detail);
      expect(result.meal.mealType).toBe(mealType);
    });
  });
});

// =============================================================================
// Entry Create/Update Request Mappers
// =============================================================================

describe("mapEntryToCreateRequest", () => {
  it("maps Entry to ApiCreateEntryRequest with all fields", () => {
    const entry: Omit<Entry, "id" | "createdAt" | "updatedAt"> = {
      userId: "1",
      timestamp: new Date("2024-01-01T08:00:00Z"),
      notes: "Test notes",
      meal: {
        photoUri: "https://example.com/photo.jpg",
        mealType: MealType.BREAKFAST,
      },
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        address: "123 Main St",
      },
    };

    const result = mapEntryToCreateRequest(entry);

    expect(result.meal_type).toBe("breakfast");
    expect(result.notes).toBe("Test notes");
    expect(result.eaten_at).toBe("2024-01-01T08:00:00.000Z");
    expect(result.location).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      address: "123 Main St",
    });
  });

  it("does not set notes when notes is empty", () => {
    const entry: Omit<Entry, "id" | "createdAt" | "updatedAt"> = {
      userId: "1",
      timestamp: new Date("2024-01-01T08:00:00Z"),
      notes: "",
      meal: {
        photoUri: "https://example.com/photo.jpg",
        mealType: MealType.LUNCH,
      },
    };

    const result = mapEntryToCreateRequest(entry);

    expect(result.notes).toBeUndefined();
  });

  it("handles location without address", () => {
    const entry: Omit<Entry, "id" | "createdAt" | "updatedAt"> = {
      userId: "1",
      timestamp: new Date("2024-01-01T08:00:00Z"),
      notes: "Test",
      meal: {
        photoUri: "https://example.com/photo.jpg",
        mealType: MealType.DINNER,
      },
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
    };

    const result = mapEntryToCreateRequest(entry);

    expect(result.location).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
    });
  });

  it("handles missing location", () => {
    const entry: Omit<Entry, "id" | "createdAt" | "updatedAt"> = {
      userId: "1",
      timestamp: new Date("2024-01-01T08:00:00Z"),
      notes: "Test",
      meal: {
        photoUri: "https://example.com/photo.jpg",
        mealType: MealType.SNACK,
      },
    };

    const result = mapEntryToCreateRequest(entry);

    expect(result.location).toBeUndefined();
  });
});

describe("mapEntryToUpdateRequest", () => {
  it("maps partial Entry to ApiUpdateEntryRequest", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {
      notes: "Updated notes",
      meal: {
        photoUri: "https://example.com/photo.jpg",
        mealType: MealType.LUNCH,
      },
      timestamp: new Date("2024-01-01T12:00:00Z"),
    };

    const result = mapEntryToUpdateRequest(updates);

    expect(result.meal_type).toBe("lunch");
    expect(result.notes).toBe("Updated notes");
    expect(result.eaten_at).toBe("2024-01-01T12:00:00.000Z");
  });

  it("sets notes to empty string when notes is empty string", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {
      notes: "",
      meal: {
        photoUri: "https://example.com/photo.jpg",
        mealType: MealType.DINNER,
      },
    };

    const result = mapEntryToUpdateRequest(updates);

    expect(result.notes).toBe("");
  });

  it("handles only meal type update", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {
      meal: {
        photoUri: "https://example.com/photo.jpg",
        mealType: MealType.SNACK,
      },
    };

    const result = mapEntryToUpdateRequest(updates);

    expect(result.meal_type).toBe("snack");
    expect(result.notes).toBeUndefined();
    expect(result.eaten_at).toBeUndefined();
  });

  it("handles only timestamp update", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {
      timestamp: new Date("2024-01-01T15:00:00Z"),
    };

    const result = mapEntryToUpdateRequest(updates);

    expect(result.eaten_at).toBe("2024-01-01T15:00:00.000Z");
    expect(result.meal_type).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });

  it("handles empty updates", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {};

    const result = mapEntryToUpdateRequest(updates);

    expect(result).toEqual({});
  });

  it("maps rating field", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {
      rating: 4,
    };

    const result = mapEntryToUpdateRequest(updates);

    expect(result.rating).toBe(4);
  });

  it("maps wouldEatAgain to would_eat_again", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {
      wouldEatAgain: true,
    };

    const result = mapEntryToUpdateRequest(updates);

    expect(result.would_eat_again).toBe(true);
  });

  it("handles update with only rating", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {
      rating: 5,
    };

    const result = mapEntryToUpdateRequest(updates);

    expect(result.rating).toBe(5);
    expect(result.notes).toBeUndefined();
    expect(result.meal_type).toBeUndefined();
    expect(result.eaten_at).toBeUndefined();
    expect(result.would_eat_again).toBeUndefined();
  });

  it("handles update with only wouldEatAgain", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {
      wouldEatAgain: false,
    };

    const result = mapEntryToUpdateRequest(updates);

    expect(result.would_eat_again).toBe(false);
    expect(result.notes).toBeUndefined();
    expect(result.meal_type).toBeUndefined();
    expect(result.eaten_at).toBeUndefined();
    expect(result.rating).toBeUndefined();
  });

  it("handles rating value 0", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {
      rating: 0,
    };

    const result = mapEntryToUpdateRequest(updates);

    expect(result.rating).toBe(0);
  });
});

// =============================================================================
// Diary Entry Detail - New Fields
// =============================================================================

describe("mapApiDiaryEntryDetailToEntry - new fields", () => {
  it("maps rating from detail to entry", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "breakfast",
      notes: null,
      eaten_at: "2024-01-01T08:00:00Z",
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      rating: 4,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.rating).toBe(4);
  });

  it("maps would_eat_again from detail to entry.wouldEatAgain", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "lunch",
      notes: null,
      eaten_at: "2024-01-01T12:00:00Z",
      created_at: "2024-01-01T12:00:00Z",
      updated_at: "2024-01-01T12:00:00Z",
      rating: null,
      would_eat_again: true,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.wouldEatAgain).toBe(true);
  });

  it("maps ingredients to meal.ingredients as string array", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "dinner",
      notes: null,
      eaten_at: "2024-01-01T18:00:00Z",
      created_at: "2024-01-01T18:00:00Z",
      updated_at: "2024-01-01T18:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [
        {
          id: 1,
          entry_id: 100,
          ingredient_id: 10,
          ingredient_name: "Chicken",
          amount: "200",
          unit: "g",
          created_at: "2024-01-01T18:00:00Z",
        },
        {
          id: 2,
          entry_id: 100,
          ingredient_id: 11,
          ingredient_name: "Rice",
          amount: null,
          unit: null,
          created_at: "2024-01-01T18:00:00Z",
        },
      ],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.meal.ingredients).toEqual(["Chicken", "Rice"]);
  });

  it("handles null rating", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "snack",
      notes: null,
      eaten_at: "2024-01-01T15:00:00Z",
      created_at: "2024-01-01T15:00:00Z",
      updated_at: "2024-01-01T15:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.rating).toBeUndefined();
  });

  it("handles null would_eat_again", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "dessert",
      notes: null,
      eaten_at: "2024-01-01T20:00:00Z",
      created_at: "2024-01-01T20:00:00Z",
      updated_at: "2024-01-01T20:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.wouldEatAgain).toBeUndefined();
  });

  it("handles empty ingredients array", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "breakfast",
      notes: null,
      eaten_at: "2024-01-01T08:00:00Z",
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      rating: null,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.meal.ingredients).toBeUndefined();
  });

  it("maps rating value 0", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "breakfast",
      notes: null,
      eaten_at: "2024-01-01T08:00:00Z",
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      rating: 0,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.rating).toBe(0);
  });

  it("maps rating value 5", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "breakfast",
      notes: null,
      eaten_at: "2024-01-01T08:00:00Z",
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      rating: 5,
      would_eat_again: null,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.rating).toBe(5);
  });

  it("maps would_eat_again false", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "lunch",
      notes: null,
      eaten_at: "2024-01-01T12:00:00Z",
      created_at: "2024-01-01T12:00:00Z",
      updated_at: "2024-01-01T12:00:00Z",
      rating: null,
      would_eat_again: false,
      location: null,
      photos: [],
      nutrition: null,
      ingredients: [],
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.wouldEatAgain).toBe(false);
  });
});

// =============================================================================
// mapApiAiAnalysisToAIAnalysis
// =============================================================================

describe("mapApiAiAnalysisToAIAnalysis", () => {
  const baseAnalysis: ApiAiAnalysis = {
    id: 1,
    entry_id: 100,
    calories: "500",
    protein_grams: "25.5",
    fat_grams: "15.3",
    carbs_grams: "60.2",
    fiber_grams: "8.1",
    sugar_grams: "12.4",
    sodium_mg: "450.7",
    description: "A hearty meal",
    confidence_score: "0.92",
    raw_response: null,
    created_at: "2024-01-01T00:00:00Z",
    status: "completed",
    error_message: null,
  };

  it("returns undefined when status is not completed", () => {
    const pending: ApiAiAnalysis = { ...baseAnalysis, status: "pending" };
    expect(mapApiAiAnalysisToAIAnalysis(pending)).toBeUndefined();
  });

  it("returns undefined when status is processing", () => {
    const processing: ApiAiAnalysis = { ...baseAnalysis, status: "processing" };
    expect(mapApiAiAnalysisToAIAnalysis(processing)).toBeUndefined();
  });

  it("returns undefined when status is failed", () => {
    const failed: ApiAiAnalysis = { ...baseAnalysis, status: "failed" };
    expect(mapApiAiAnalysisToAIAnalysis(failed)).toBeUndefined();
  });

  it("returns AIAnalysis when status is completed", () => {
    const result = mapApiAiAnalysisToAIAnalysis(baseAnalysis);
    expect(result).not.toBeUndefined();
  });

  it("maps all nutrition fields from string to number", () => {
    const result = mapApiAiAnalysisToAIAnalysis(baseAnalysis);
    expect(result!.nutrition.calories).toBe(500);
    expect(result!.nutrition.protein).toBe(25.5);
    expect(result!.nutrition.fat).toBe(15.3);
    expect(result!.nutrition.carbs).toBe(60.2);
    expect(result!.nutrition.fiber).toBe(8.1);
    expect(result!.nutrition.sugar).toBe(12.4);
    expect(result!.nutrition.sodium).toBe(450.7);
  });

  it("maps confidence_score to confidence number", () => {
    const result = mapApiAiAnalysisToAIAnalysis(baseAnalysis);
    expect(result!.confidence).toBe(0.92);
  });

  it("sets detectedMeals to empty array", () => {
    const result = mapApiAiAnalysisToAIAnalysis(baseAnalysis);
    expect(result!.detectedMeals).toEqual([]);
  });

  it("sets mealCategory to OTHER", () => {
    const result = mapApiAiAnalysisToAIAnalysis(baseAnalysis);
    expect(result!.mealCategory).toBe("other");
  });

  it("uses ingredients from raw_response when available", () => {
    const withRaw: ApiAiAnalysis = {
      ...baseAnalysis,
      raw_response: { ingredients: ["chicken", "rice", "broccoli"] },
    };
    const result = mapApiAiAnalysisToAIAnalysis(withRaw);
    expect(result!.ingredients).toEqual(["chicken", "rice", "broccoli"]);
  });

  it("sets ingredients to empty array when raw_response is null", () => {
    const withNullRaw: ApiAiAnalysis = { ...baseAnalysis, raw_response: null };
    const result = mapApiAiAnalysisToAIAnalysis(withNullRaw);
    expect(result!.ingredients).toEqual([]);
  });

  it("uses comment from raw_response when available", () => {
    const withComment: ApiAiAnalysis = {
      ...baseAnalysis,
      raw_response: { comment: "What a delicious looking meal!" },
    };
    const result = mapApiAiAnalysisToAIAnalysis(withComment);
    expect(result!.comment).toBe("What a delicious looking meal!");
  });

  it("falls back to description when raw_response comment is absent", () => {
    const withDescription: ApiAiAnalysis = {
      ...baseAnalysis,
      description: "Looks tasty",
      raw_response: {},
    };
    const result = mapApiAiAnalysisToAIAnalysis(withDescription);
    expect(result!.comment).toBe("Looks tasty");
  });

  it("uses undefined for comment when both raw_response comment and description are null", () => {
    const noComment: ApiAiAnalysis = {
      ...baseAnalysis,
      description: null,
      raw_response: {},
    };
    const result = mapApiAiAnalysisToAIAnalysis(noComment);
    expect(result!.comment).toBeUndefined();
  });

  it("handles null nutrition fields by returning 0", () => {
    const nullNutrition: ApiAiAnalysis = {
      ...baseAnalysis,
      calories: null,
      protein_grams: null,
      fat_grams: null,
      carbs_grams: null,
      fiber_grams: null,
      sugar_grams: null,
      sodium_mg: null,
    };
    const result = mapApiAiAnalysisToAIAnalysis(nullNutrition);
    expect(result!.nutrition.calories).toBe(0);
    expect(result!.nutrition.protein).toBe(0);
    expect(result!.nutrition.fat).toBe(0);
    expect(result!.nutrition.carbs).toBe(0);
    expect(result!.nutrition.fiber).toBe(0);
    expect(result!.nutrition.sugar).toBe(0);
    expect(result!.nutrition.sodium).toBe(0);
  });

  it("handles null confidence_score by returning 0", () => {
    const noConfidence: ApiAiAnalysis = { ...baseAnalysis, confidence_score: null };
    const result = mapApiAiAnalysisToAIAnalysis(noConfidence);
    expect(result!.confidence).toBe(0);
  });

  it("handles invalid numeric strings by returning 0", () => {
    const invalidNutrition: ApiAiAnalysis = {
      ...baseAnalysis,
      calories: "not-a-number",
      protein_grams: "NaN",
    };
    const result = mapApiAiAnalysisToAIAnalysis(invalidNutrition);
    expect(result!.nutrition.calories).toBe(0);
    expect(result!.nutrition.protein).toBe(0);
  });
});

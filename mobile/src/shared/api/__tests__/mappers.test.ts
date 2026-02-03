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
} from "../mappers";
import type {
  ApiUserInfo,
  ApiUser,
  ApiUserNutrition,
  ApiDiaryEntryDetail,
  ApiEntryPhoto,
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
      title: "Breakfast",
      notes: "Delicious meal",
      eaten_at: "2024-01-01T08:00:00Z",
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      location,
      photos,
      nutrition,
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
      title: "Lunch",
      notes: null,
      eaten_at: "2024-01-01T12:00:00Z",
      created_at: "2024-01-01T12:00:00Z",
      updated_at: "2024-01-01T12:00:00Z",
      location: null,
      photos,
      nutrition: null,
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
      title: "Dinner",
      notes: null,
      eaten_at: "2024-01-01T18:00:00Z",
      created_at: "2024-01-01T18:00:00Z",
      updated_at: "2024-01-01T18:00:00Z",
      location: null,
      photos,
      nutrition: null,
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.meal.photoUri).toBe("https://example.com/photo1.jpg");
  });

  it("handles empty photos array", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "snack",
      title: "Snack",
      notes: null,
      eaten_at: "2024-01-01T15:00:00Z",
      created_at: "2024-01-01T15:00:00Z",
      updated_at: "2024-01-01T15:00:00Z",
      location: null,
      photos: [],
      nutrition: null,
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
      title: "Snack",
      notes: null,
      eaten_at: "2024-01-01T15:00:00Z",
      created_at: "2024-01-01T15:00:00Z",
      updated_at: "2024-01-01T15:00:00Z",
      location: null,
      photos: [],
      nutrition: null,
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.meal.photoUris).toBeUndefined();
  });

  it("handles null notes", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "lunch",
      title: "Lunch",
      notes: null,
      eaten_at: "2024-01-01T12:00:00Z",
      created_at: "2024-01-01T12:00:00Z",
      updated_at: "2024-01-01T12:00:00Z",
      location: null,
      photos: [],
      nutrition: null,
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
      title: "Dinner",
      notes: null,
      eaten_at: "2024-01-01T18:00:00Z",
      created_at: "2024-01-01T18:00:00Z",
      updated_at: "2024-01-01T18:00:00Z",
      location,
      photos: [],
      nutrition: null,
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
      title: "Breakfast",
      notes: null,
      eaten_at: "2024-01-01T08:00:00Z",
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      location: null,
      photos: [],
      nutrition: null,
    };

    const result = mapApiDiaryEntryDetailToEntry(detail);

    expect(result.location).toBeUndefined();
  });

  it("handles null nutrition", () => {
    const detail: ApiDiaryEntryDetail = {
      id: 100,
      user_id: 1,
      meal_type: "breakfast",
      title: "Breakfast",
      notes: null,
      eaten_at: "2024-01-01T08:00:00Z",
      created_at: "2024-01-01T08:00:00Z",
      updated_at: "2024-01-01T08:00:00Z",
      location: null,
      photos: [],
      nutrition: null,
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
        title: "Meal",
        notes: null,
        eaten_at: "2024-01-01T12:00:00Z",
        created_at: "2024-01-01T12:00:00Z",
        updated_at: "2024-01-01T12:00:00Z",
        location: null,
        photos: [],
        nutrition: null,
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
    expect(result.title).toBe("Test notes");
    expect(result.notes).toBe("Test notes");
    expect(result.eaten_at).toBe("2024-01-01T08:00:00.000Z");
    expect(result.location).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      address: "123 Main St",
    });
  });

  it("uses meal type as title when notes is empty", () => {
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

    expect(result.title).toBe("lunch");
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
    expect(result.title).toBe("Updated notes");
    expect(result.notes).toBe("Updated notes");
    expect(result.eaten_at).toBe("2024-01-01T12:00:00.000Z");
  });

  it("uses meal type as title when notes is empty string", () => {
    const updates: Partial<Omit<Entry, "id" | "createdAt">> = {
      notes: "",
      meal: {
        photoUri: "https://example.com/photo.jpg",
        mealType: MealType.DINNER,
      },
    };

    const result = mapEntryToUpdateRequest(updates);

    expect(result.title).toBe("dinner");
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
});

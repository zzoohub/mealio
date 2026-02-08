// Mock modules before any imports
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
  Share: {
    share: jest.fn(),
  },
  Platform: {
    OS: "ios",
  },
}));
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));
jest.mock("@/shared/config", () => ({
  CAMERA_SETTINGS: {
    MAX_PHOTOS_PER_POST: 5,
    DEFAULT_QUALITY: 0.8,
  },
  queryKeys: {
    diary: {
      all: jest.fn(() => ["diary"]),
      detail: jest.fn((id: number) => ["diary", "detail", id]),
    },
  },
}));
jest.mock("@/shared/api", () => ({
  mapEntryToUpdateRequest: jest.fn(),
  mapNutritionInfoToUpsertRequest: jest.fn(),
  uploadPhoto: jest.fn(),
}));
jest.mock("@/entities/entry", () => ({
  entryStorageUtils: {
    getEntryById: jest.fn(),
    updateEntry: jest.fn(),
    deleteEntry: jest.fn(),
  },
  useEntryDetailQuery: jest.fn(),
  useUpdateEntryMutation: jest.fn(),
  useSyncIngredientsMutation: jest.fn(),
  useUpsertNutritionMutation: jest.fn(),
  useDeleteEntryMutation: jest.fn(),
  photoApi: {
    createPhoto: jest.fn(),
  },
}));
jest.mock("@/shared/lib/auth", () => ({
  useIsAuthenticated: jest.fn(),
}));
jest.mock("@/shared/lib/i18n", () => ({
  useDiaryI18n: jest.fn(),
  useCommonI18n: jest.fn(),
  useErrorI18n: jest.fn(),
}));
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

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useEntryDetail } from "../useEntryDetail";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  entryStorageUtils,
  useEntryDetailQuery,
  useUpdateEntryMutation,
  useSyncIngredientsMutation,
  useUpsertNutritionMutation,
  useDeleteEntryMutation,
  photoApi,
} from "@/entities/entry";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { useDiaryI18n, useCommonI18n, useErrorI18n } from "@/shared/lib/i18n";
import { MealType } from "@/entities/meal";
import { CAMERA_SETTINGS, queryKeys } from "@/shared/config";

// Get mock references
const { mapEntryToUpdateRequest, mapNutritionInfoToUpsertRequest, uploadPhoto } = jest.requireMock("@/shared/api");

describe("useEntryDetail", () => {
  const mockRouter = {
    back: jest.fn(),
  };

  const mockUpdateMutation = {
    mutate: jest.fn(),
  };

  const mockSyncIngredientsMutation = {
    mutate: jest.fn(),
  };

  const mockUpsertNutritionMutation = {
    mutate: jest.fn(),
  };

  const mockDeleteMutation = {
    mutateAsync: jest.fn(),
  };

  const mockQueryClient = {
    invalidateQueries: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-setup queryKeys mocks after clearAllMocks
    const { queryKeys } = jest.requireMock("@/shared/config");
    queryKeys.diary.all.mockReturnValue(["diary"]);
    queryKeys.diary.detail.mockImplementation((id: number) => ["diary", "detail", id]);

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useUpdateEntryMutation as jest.Mock).mockReturnValue(mockUpdateMutation);
    (useSyncIngredientsMutation as jest.Mock).mockReturnValue(mockSyncIngredientsMutation);
    (useUpsertNutritionMutation as jest.Mock).mockReturnValue(mockUpsertNutritionMutation);
    (useDeleteEntryMutation as jest.Mock).mockReturnValue(mockDeleteMutation);
    (useEntryDetailQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    (useDiaryI18n as jest.Mock).mockReturnValue({
      deleteEntryTitle: "Delete Entry",
      deleteEntryMessage: "Are you sure?",
      maxPhotosReached: "Maximum photos reached",
      maxPhotosMessage: jest.fn((max: number) => `You can add up to ${max} photos per entry.`),
      addPhotoFailed: "Failed to add photos",
    });
    (useCommonI18n as jest.Mock).mockReturnValue({
      cancel: "Cancel",
      delete: "Delete",
      error: "Error",
      ok: "OK",
    });
    (useErrorI18n as jest.Mock).mockReturnValue({
      deleteFailed: "Delete failed",
    });

    const { useQueryClient } = jest.requireMock("@tanstack/react-query");
    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);

    // Mock the mapper functions with proper implementation
    (mapEntryToUpdateRequest as jest.Mock).mockImplementation((updates) => {
      const req: any = {};
      if (updates.rating !== undefined) req.rating = updates.rating;
      if (updates.wouldEatAgain !== undefined) req.would_eat_again = updates.wouldEatAgain;
      if (updates.notes !== undefined) {
        req.notes = updates.notes;
      }
      if (updates.meal?.mealType) req.meal_type = updates.meal.mealType;
      if (updates.timestamp) req.eaten_at = updates.timestamp.toISOString();
      return req;
    });

    (mapNutritionInfoToUpsertRequest as jest.Mock).mockImplementation((nutrition) => ({
      calories: String(nutrition.calories ?? 0),
      protein_grams: String(nutrition.protein ?? 0),
      fat_grams: String(nutrition.fat ?? 0),
      carbs_grams: String(nutrition.carbs ?? 0),
      fiber_grams: String(nutrition.fiber ?? 0),
      sugar_grams: String(nutrition.sugar ?? 0),
      sodium_mg: String(nutrition.sodium ?? 0),
    }));
  });

  describe("updateRating", () => {
    it("calls updateEntryMutation.mutate when isApiEntry is true", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      act(() => {
        result.current.updateRating(4);
      });

      expect(mockUpdateMutation.mutate).toHaveBeenCalledWith({
        id: 123,
        body: expect.objectContaining({ rating: 4 }),
      });
      expect(entryStorageUtils.updateEntry).not.toHaveBeenCalled();
    });

    it("calls updateGuestEntry when isApiEntry is false", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-123",
        userId: "guest",
        timestamp: new Date(),
        notes: "Test",
        meal: { photoUri: "", mealType: MealType.BREAKFAST },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);
      (entryStorageUtils.updateEntry as jest.Mock).mockResolvedValue({
        ...mockEntry,
        rating: 5,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-123" }));

      // Wait for guest entry to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateRating(5);
      });

      // Wait for update to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(entryStorageUtils.updateEntry).toHaveBeenCalledWith("guest-123", { rating: 5 });
      expect(mockUpdateMutation.mutate).not.toHaveBeenCalled();
    });
  });

  describe("updateWouldEatAgain", () => {
    it("calls updateEntryMutation.mutate when isApiEntry is true", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "456",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "", mealType: MealType.LUNCH },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "456" }));

      act(() => {
        result.current.updateWouldEatAgain(true);
      });

      expect(mockUpdateMutation.mutate).toHaveBeenCalledWith({
        id: 456,
        body: expect.objectContaining({ would_eat_again: true }),
      });
      expect(entryStorageUtils.updateEntry).not.toHaveBeenCalled();
    });

    it("calls updateGuestEntry when isApiEntry is false", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-456",
        userId: "guest",
        timestamp: new Date(),
        notes: "Test",
        meal: { photoUri: "", mealType: MealType.LUNCH },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);
      (entryStorageUtils.updateEntry as jest.Mock).mockResolvedValue({
        ...mockEntry,
        wouldEatAgain: false,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-456" }));

      // Wait for guest entry to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateWouldEatAgain(false);
      });

      // Wait for update to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(entryStorageUtils.updateEntry).toHaveBeenCalledWith("guest-456", { wouldEatAgain: false });
      expect(mockUpdateMutation.mutate).not.toHaveBeenCalled();
    });
  });

  describe("updateIngredients", () => {
    it("calls syncIngredientsMutation.mutate when isApiEntry is true", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "789",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "", mealType: MealType.DINNER },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "789" }));

      act(() => {
        result.current.updateIngredients(["Chicken", "Rice"]);
      });

      expect(mockSyncIngredientsMutation.mutate).toHaveBeenCalledWith({
        entryId: 789,
        ingredientNames: ["Chicken", "Rice"],
      });
      expect(entryStorageUtils.updateEntry).not.toHaveBeenCalled();
    });

    it("calls updateGuestEntry when isApiEntry is false", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-789",
        userId: "guest",
        timestamp: new Date(),
        notes: "Test",
        meal: { photoUri: "", mealType: MealType.DINNER },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);
      (entryStorageUtils.updateEntry as jest.Mock).mockResolvedValue({
        ...mockEntry,
        meal: { ...mockEntry.meal, ingredients: ["Pasta", "Tomato"] },
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-789" }));

      // Wait for guest entry to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateIngredients(["Pasta", "Tomato"]);
      });

      // Wait for update to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(entryStorageUtils.updateEntry).toHaveBeenCalledWith("guest-789", {
        meal: expect.objectContaining({ ingredients: ["Pasta", "Tomato"] }),
      });
      expect(mockSyncIngredientsMutation.mutate).not.toHaveBeenCalled();
    });
  });

  describe("updateTimestamp", () => {
    it("calls updateEntryMutation.mutate when isApiEntry is true", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "555",
          userId: "1",
          timestamp: new Date(2026, 0, 1, 12, 0, 0),
          notes: "Test",
          meal: { photoUri: "", mealType: MealType.LUNCH },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "555" }));

      const newTimestamp = new Date(2026, 0, 2, 14, 30, 0);
      act(() => {
        result.current.updateTimestamp(newTimestamp);
      });

      expect(mockUpdateMutation.mutate).toHaveBeenCalledWith({
        id: 555,
        body: expect.objectContaining({ eaten_at: newTimestamp.toISOString() }),
      });
      expect(entryStorageUtils.updateEntry).not.toHaveBeenCalled();
    });

    it("calls updateGuestEntry when isApiEntry is false", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-555",
        userId: "guest",
        timestamp: new Date(2026, 0, 1, 12, 0, 0),
        notes: "Test",
        meal: { photoUri: "", mealType: MealType.LUNCH },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newTimestamp = new Date(2026, 0, 2, 14, 30, 0);
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);
      (entryStorageUtils.updateEntry as jest.Mock).mockResolvedValue({
        ...mockEntry,
        timestamp: newTimestamp,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-555" }));

      // Wait for guest entry to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateTimestamp(newTimestamp);
      });

      // Wait for update to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(entryStorageUtils.updateEntry).toHaveBeenCalledWith("guest-555", { timestamp: newTimestamp });
      expect(mockUpdateMutation.mutate).not.toHaveBeenCalled();
    });

    it("handles error when guest entry update fails", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockEntry = {
        id: "guest-error",
        userId: "guest",
        timestamp: new Date(2026, 0, 1, 12, 0, 0),
        notes: "Test",
        meal: { photoUri: "", mealType: MealType.LUNCH },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newTimestamp = new Date(2026, 0, 2, 14, 30, 0);
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);
      (entryStorageUtils.updateEntry as jest.Mock).mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-error" }));

      // Wait for guest entry to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateTimestamp(newTimestamp);
      });

      // Wait for update to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should have attempted the update
      expect(entryStorageUtils.updateEntry).toHaveBeenCalled();
      // Error should be logged
      expect(consoleSpy).toHaveBeenCalledWith("Failed to update entry:", expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe("updateMealType", () => {
    it("calls updateEntryMutation.mutate when isApiEntry is true", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "321",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "321" }));

      act(() => {
        result.current.updateMealType(MealType.LUNCH);
      });

      expect(mockUpdateMutation.mutate).toHaveBeenCalled();
      expect(entryStorageUtils.updateEntry).not.toHaveBeenCalled();
    });

    it("calls updateGuestEntry when isApiEntry is false", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-321",
        userId: "guest",
        timestamp: new Date(),
        notes: "Test",
        meal: { photoUri: "", mealType: MealType.BREAKFAST },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);
      (entryStorageUtils.updateEntry as jest.Mock).mockResolvedValue({
        ...mockEntry,
        meal: { ...mockEntry.meal, mealType: MealType.LUNCH },
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-321" }));

      // Wait for guest entry to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateMealType(MealType.LUNCH);
      });

      // Wait for update to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(entryStorageUtils.updateEntry).toHaveBeenCalled();
      expect(mockUpdateMutation.mutate).not.toHaveBeenCalled();
    });
  });

  describe("updateNotes", () => {
    it("calls updateEntryMutation.mutate immediately when isApiEntry is true", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "654",
          userId: "1",
          timestamp: new Date(),
          notes: "Old notes",
          meal: { photoUri: "", mealType: MealType.SNACK },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "654" }));

      act(() => {
        result.current.updateNotes("New notes");
      });

      expect(mockUpdateMutation.mutate).toHaveBeenCalledWith({
        id: 654,
        body: expect.objectContaining({ notes: "New notes" }),
      });
      expect(entryStorageUtils.updateEntry).not.toHaveBeenCalled();
    });

    it("calls updateGuestEntry when isApiEntry is false", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-654",
        userId: "guest",
        timestamp: new Date(),
        notes: "Old notes",
        meal: { photoUri: "", mealType: MealType.SNACK },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);
      (entryStorageUtils.updateEntry as jest.Mock).mockResolvedValue({
        ...mockEntry,
        notes: "New notes",
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-654" }));

      // Wait for guest entry to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateNotes("New notes");
      });

      // Wait for update to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(entryStorageUtils.updateEntry).toHaveBeenCalled();
      expect(mockUpdateMutation.mutate).not.toHaveBeenCalled();
    });
  });

  describe("updateNutrition", () => {
    it("calls upsertNutritionMutation.mutate when isApiEntry is true", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "987",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "987" }));

      const nutrition = {
        calories: 500,
        protein: 25,
        fat: 15,
        carbs: 60,
        fiber: 8,
        sugar: 12,
        sodium: 450,
      };

      act(() => {
        result.current.updateNutrition(nutrition);
      });

      expect(mockUpsertNutritionMutation.mutate).toHaveBeenCalledWith({
        entryId: 987,
        body: {
          calories: "500",
          protein_grams: "25",
          fat_grams: "15",
          carbs_grams: "60",
          fiber_grams: "8",
          sugar_grams: "12",
          sodium_mg: "450",
        },
      });
      expect(entryStorageUtils.updateEntry).not.toHaveBeenCalled();
    });

    it("calls updateGuestEntry when isApiEntry is false", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-987",
        userId: "guest",
        timestamp: new Date(),
        notes: "Test",
        meal: { photoUri: "", mealType: MealType.BREAKFAST },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);
      const nutrition = {
        calories: 500,
        protein: 25,
        fat: 15,
        carbs: 60,
        fiber: 8,
        sugar: 12,
        sodium: 450,
      };
      (entryStorageUtils.updateEntry as jest.Mock).mockResolvedValue({
        ...mockEntry,
        meal: { ...mockEntry.meal, nutrition },
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-987" }));

      // Wait for guest entry to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateNutrition(nutrition);
      });

      // Wait for update to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(entryStorageUtils.updateEntry).toHaveBeenCalled();
      expect(mockUpsertNutritionMutation.mutate).not.toHaveBeenCalled();
    });
  });

  describe("addPhotos", () => {
    it("does nothing when entry is null", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it("does nothing when entry is a guest entry", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-123",
        userId: "guest",
        timestamp: new Date(),
        notes: "Test",
        meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-123" }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it("shows alert when max photos (5) already reached", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUris: ["uri1", "uri2", "uri3", "uri4", "uri5"],
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Maximum photos reached",
        "You can add up to 5 photos per entry.",
        [{ text: "OK" }]
      );
      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it("calculates remaining photos correctly with photoUri (single photo)", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "new-photo-uri" }],
      });
      (uploadPhoto as jest.Mock).mockResolvedValue("https://uploaded.com/photo.jpg");
      (photoApi.createPhoto as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 4, // 5 max - 1 existing = 4 remaining
        quality: 0.8,
      });
    });

    it("calculates remaining photos correctly with photoUris array", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUris: ["uri1", "uri2", "uri3"],
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "new-photo-uri" }],
      });
      (uploadPhoto as jest.Mock).mockResolvedValue("https://uploaded.com/photo.jpg");
      (photoApi.createPhoto as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 2, // 5 max - 3 existing = 2 remaining
        quality: 0.8,
      });
    });

    it("launches image picker with correct params", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 4,
        quality: CAMERA_SETTINGS.DEFAULT_QUALITY,
      });
    });

    it("does nothing when image picker is canceled", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(uploadPhoto).not.toHaveBeenCalled();
      expect(photoApi.createPhoto).not.toHaveBeenCalled();
    });

    it("does nothing when image picker returns no assets", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [],
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(uploadPhoto).not.toHaveBeenCalled();
      expect(photoApi.createPhoto).not.toHaveBeenCalled();
    });

    it("sets isAddingPhotos to false initially", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      expect(result.current.isAddingPhotos).toBe(false);
    });

    it("uploads single photo and creates photo record", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "new-photo-uri" }],
      });
      (uploadPhoto as jest.Mock).mockResolvedValue("https://uploaded.com/photo.jpg");
      (photoApi.createPhoto as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(uploadPhoto).toHaveBeenCalledWith("new-photo-uri");
      expect(photoApi.createPhoto).toHaveBeenCalledWith(123, {
        url: "https://uploaded.com/photo.jpg",
        is_primary: false,
        sort_order: 1, // Current count is 1, so new photo is at index 1
      });
    });

    it("uploads multiple photos and creates photo records with correct sort_order", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUris: ["uri1", "uri2"],
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          { uri: "new-photo-1" },
          { uri: "new-photo-2" },
          { uri: "new-photo-3" },
        ],
      });
      (uploadPhoto as jest.Mock)
        .mockResolvedValueOnce("https://uploaded.com/photo1.jpg")
        .mockResolvedValueOnce("https://uploaded.com/photo2.jpg")
        .mockResolvedValueOnce("https://uploaded.com/photo3.jpg");
      (photoApi.createPhoto as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(uploadPhoto).toHaveBeenCalledTimes(3);
      expect(uploadPhoto).toHaveBeenNthCalledWith(1, "new-photo-1");
      expect(uploadPhoto).toHaveBeenNthCalledWith(2, "new-photo-2");
      expect(uploadPhoto).toHaveBeenNthCalledWith(3, "new-photo-3");

      expect(photoApi.createPhoto).toHaveBeenCalledTimes(3);
      expect(photoApi.createPhoto).toHaveBeenNthCalledWith(1, 123, {
        url: "https://uploaded.com/photo1.jpg",
        is_primary: false,
        sort_order: 2, // Existing count is 2
      });
      expect(photoApi.createPhoto).toHaveBeenNthCalledWith(2, 123, {
        url: "https://uploaded.com/photo2.jpg",
        is_primary: false,
        sort_order: 3,
      });
      expect(photoApi.createPhoto).toHaveBeenNthCalledWith(3, 123, {
        url: "https://uploaded.com/photo3.jpg",
        is_primary: false,
        sort_order: 4,
      });
    });

    it("invalidates queries after successful upload", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "new-photo-uri" }],
      });
      (uploadPhoto as jest.Mock).mockResolvedValue("https://uploaded.com/photo.jpg");
      (photoApi.createPhoto as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["diary", "detail", 123],
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["diary"],
      });
    });

    it("handles upload error and shows alert", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "new-photo-uri" }],
      });
      (uploadPhoto as jest.Mock).mockRejectedValue(new Error("Upload failed"));

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(Alert.alert).toHaveBeenCalledWith("Error", "Failed to add photos");
      expect(photoApi.createPhoto).not.toHaveBeenCalled();
      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
    });

    it("handles API error when creating photo record and shows alert", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "new-photo-uri" }],
      });
      (uploadPhoto as jest.Mock).mockResolvedValue("https://uploaded.com/photo.jpg");
      (photoApi.createPhoto as jest.Mock).mockRejectedValue(new Error("API error"));

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(Alert.alert).toHaveBeenCalledWith("Error", "Failed to add photos");
      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
    });

    it("sets isAddingPhotos back to false after error", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "new-photo-uri" }],
      });
      (uploadPhoto as jest.Mock).mockRejectedValue(new Error("Upload failed"));

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(result.current.isAddingPhotos).toBe(false);
    });

    it("logs error to console when upload fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: {
            photoUri: "uri1",
            mealType: MealType.BREAKFAST,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "new-photo-uri" }],
      });
      const uploadError = new Error("Upload failed");
      (uploadPhoto as jest.Mock).mockRejectedValue(uploadError);

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      await act(async () => {
        await result.current.addPhotos();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to add photos:", uploadError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("shareEntry", () => {
    beforeEach(() => {
      jest.mock("react-native", () => ({
        Alert: {
          alert: jest.fn(),
        },
        Share: {
          share: jest.fn(),
        },
        Platform: {
          OS: "ios",
        },
      }));
    });

    it("shares entry URL on iOS", async () => {
      const { Share, Platform } = jest.requireMock("react-native");
      Platform.OS = "ios";

      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      (useCommonI18n as jest.Mock).mockReturnValue({
        cancel: "Cancel",
        delete: "Delete",
        error: "Error",
        ok: "OK",
        shareEntry: "Check out this meal!",
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      act(() => {
        result.current.shareEntry();
      });

      expect(Share.share).toHaveBeenCalledWith({
        url: "https://mealio.zzooapp.com/diary/123",
        message: "Check out this meal!",
      });
    });

    it("shares entry URL on Android with message and URL concatenated", async () => {
      const { Share, Platform } = jest.requireMock("react-native");
      Platform.OS = "android";

      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "456",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      (useCommonI18n as jest.Mock).mockReturnValue({
        cancel: "Cancel",
        delete: "Delete",
        error: "Error",
        ok: "OK",
        shareEntry: "Check out this meal!",
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "456" }));

      act(() => {
        result.current.shareEntry();
      });

      expect(Share.share).toHaveBeenCalledWith({
        message: "Check out this meal!\nhttps://mealio.zzooapp.com/diary/456",
      });
    });

    it("does nothing when entry is null", () => {
      const { Share } = jest.requireMock("react-native");

      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      act(() => {
        result.current.shareEntry();
      });

      expect(Share.share).not.toHaveBeenCalled();
    });

    it("does nothing when entry is a guest entry", async () => {
      const { Share } = jest.requireMock("react-native");

      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-123",
        userId: "guest",
        timestamp: new Date(),
        notes: "Test",
        meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-123" }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.shareEntry();
      });

      expect(Share.share).not.toHaveBeenCalled();
    });
  });

  describe("canShare", () => {
    it("returns true when entry is API entry and exists", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      expect(result.current.canShare).toBe(true);
    });

    it("returns false when entry is null", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      expect(result.current.canShare).toBe(false);
    });

    it("returns false when entry is a guest entry", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-123",
        userId: "guest",
        timestamp: new Date(),
        notes: "Test",
        meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-123" }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.canShare).toBe(false);
    });
  });

  describe("deleteEntry", () => {
    it("shows confirmation alert with correct text", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      act(() => {
        result.current.deleteEntry();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Delete Entry",
        "Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: expect.any(Function),
          },
        ]
      );
    });

    it("deletes API entry and navigates back on confirmation", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (mockDeleteMutation.mutateAsync as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      act(() => {
        result.current.deleteEntry();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2][1];

      await act(async () => {
        await confirmButton.onPress();
      });

      expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledWith(123);
      expect(mockRouter.back).toHaveBeenCalled();
    });

    it("deletes guest entry and navigates back on confirmation", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-123",
        userId: "guest",
        timestamp: new Date(),
        notes: "Test",
        meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);
      (entryStorageUtils.deleteEntry as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-123" }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.deleteEntry();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2][1];

      await act(async () => {
        await confirmButton.onPress();
      });

      expect(entryStorageUtils.deleteEntry).toHaveBeenCalledWith("guest-123");
      expect(mockRouter.back).toHaveBeenCalled();
    });

    it("shows error alert when API delete fails", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });
      (mockDeleteMutation.mutateAsync as jest.Mock).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      act(() => {
        result.current.deleteEntry();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2][1];

      await act(async () => {
        await confirmButton.onPress();
      });

      expect(Alert.alert).toHaveBeenCalledWith("Error", "Delete failed");
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    it("shows error alert when guest delete fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const mockEntry = {
        id: "guest-123",
        userId: "guest",
        timestamp: new Date(),
        notes: "Test",
        meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(mockEntry);
      (entryStorageUtils.deleteEntry as jest.Mock).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-123" }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.deleteEntry();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2][1];

      await act(async () => {
        await confirmButton.onPress();
      });

      expect(Alert.alert).toHaveBeenCalledWith("Error", "Delete failed");
      expect(mockRouter.back).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("does nothing when entryId is undefined", async () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: undefined }));

      act(() => {
        result.current.deleteEntry();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2][1];

      await act(async () => {
        await confirmButton.onPress();
      });

      expect(mockDeleteMutation.mutateAsync).not.toHaveBeenCalled();
      expect(entryStorageUtils.deleteEntry).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
    });
  });

  describe("guest entry loading", () => {
    it("handles entry not found error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      (entryStorageUtils.getEntryById as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-123" }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.entry).toBeNull();
      expect(result.current.error).toEqual(new Error("Entry not found"));

      consoleErrorSpy.mockRestore();
    });

    it("handles storage read error", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      const storageError = new Error("Storage error");
      (entryStorageUtils.getEntryById as jest.Mock).mockRejectedValue(storageError);

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-123" }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.entry).toBeNull();
      expect(result.current.error).toEqual(storageError);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load entry:", storageError);

      consoleErrorSpy.mockRestore();
    });

    it("handles non-Error exception", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      (useIsAuthenticated as jest.Mock).mockReturnValue(false);
      (entryStorageUtils.getEntryById as jest.Mock).mockRejectedValue("string error");

      const { result } = renderHook(() => useEntryDetail({ entryId: "guest-123" }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.entry).toBeNull();
      expect(result.current.error).toEqual(new Error("Failed to load entry"));

      consoleErrorSpy.mockRestore();
    });
  });

  describe("navigation", () => {
    it("goBack calls router.back", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      act(() => {
        result.current.goBack();
      });

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it("openPhotoViewer logs to console", () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      (useEntryDetailQuery as jest.Mock).mockReturnValue({
        data: {
          id: "123",
          userId: "1",
          timestamp: new Date(),
          notes: "Test",
          meal: { photoUri: "uri1", mealType: MealType.BREAKFAST },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useEntryDetail({ entryId: "123" }));

      act(() => {
        result.current.openPhotoViewer();
      });

      expect(consoleLogSpy).toHaveBeenCalledWith("Photo pressed - implement fullscreen viewer");

      consoleLogSpy.mockRestore();
    });
  });
});

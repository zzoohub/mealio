// Mock modules before any imports
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
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
}));
jest.mock("@/shared/api", () => ({
  mapEntryToUpdateRequest: jest.fn(),
  mapNutritionInfoToUpsertRequest: jest.fn(),
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

import { renderHook, act } from "@testing-library/react-native";
import { useEntryDetail } from "../useEntryDetail";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  entryStorageUtils,
  useEntryDetailQuery,
  useUpdateEntryMutation,
  useSyncIngredientsMutation,
  useUpsertNutritionMutation,
  useDeleteEntryMutation,
} from "@/entities/entry";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { useDiaryI18n, useCommonI18n, useErrorI18n } from "@/shared/lib/i18n";
import { MealType } from "@/entities/meal";

// Get mock references
const { mapEntryToUpdateRequest, mapNutritionInfoToUpsertRequest } = jest.requireMock("@/shared/api");

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

  beforeEach(() => {
    jest.clearAllMocks();
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
    });
    (useCommonI18n as jest.Mock).mockReturnValue({
      cancel: "Cancel",
      delete: "Delete",
      error: "Error",
    });
    (useErrorI18n as jest.Mock).mockReturnValue({
      deleteFailed: "Delete failed",
    });

    // Mock the mapper functions with proper implementation
    (mapEntryToUpdateRequest as jest.Mock).mockImplementation((updates) => {
      const req: any = {};
      if (updates.rating !== undefined) req.rating = updates.rating;
      if (updates.wouldEatAgain !== undefined) req.would_eat_again = updates.wouldEatAgain;
      if (updates.notes !== undefined) {
        const title = updates.notes || updates.meal?.mealType;
        if (title) req.title = title;
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
    it("defers notes submission for API entries (does not call mutate immediately)", () => {
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

      expect(mockUpdateMutation.mutate).not.toHaveBeenCalled();
      expect(entryStorageUtils.updateEntry).not.toHaveBeenCalled();
    });

    it("preserves pending notes across refetches (re-renders)", () => {
      (useIsAuthenticated as jest.Mock).mockReturnValue(true);
      const queryData = {
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
      };
      (useEntryDetailQuery as jest.Mock).mockReturnValue(queryData);

      const { result, rerender } = renderHook(() => useEntryDetail({ entryId: "654" }));

      act(() => {
        result.current.updateNotes("New notes");
      });

      // Simulate a refetch by re-rendering (e.g. from another mutation's onSettled)
      rerender({});

      expect(result.current.entry?.notes).toBe("New notes");
    });

    it("flushes deferred notes on unmount when changed", () => {
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

      const { result, unmount } = renderHook(() => useEntryDetail({ entryId: "654" }));

      act(() => {
        result.current.updateNotes("New notes");
      });

      expect(mockUpdateMutation.mutate).not.toHaveBeenCalled();

      unmount();

      expect(mockUpdateMutation.mutate).toHaveBeenCalledWith({
        id: 654,
        body: expect.objectContaining({ notes: "New notes" }),
      });
    });

    it("does not flush on unmount when notes unchanged", () => {
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

      const { unmount } = renderHook(() => useEntryDetail({ entryId: "654" }));

      unmount();

      expect(mockUpdateMutation.mutate).not.toHaveBeenCalled();
    });

    it("does not flush on unmount when notes edited back to original", () => {
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

      const { result, unmount } = renderHook(() => useEntryDetail({ entryId: "654" }));

      act(() => {
        result.current.updateNotes("New notes");
      });
      act(() => {
        result.current.updateNotes("Old notes");
      });

      unmount();

      expect(mockUpdateMutation.mutate).not.toHaveBeenCalled();
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
});

import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { Entry, MealType, NutritionInfo } from "../types";
import { entryStorageUtils } from "./useEntryStorage";

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export interface UseEntryDetailReturn {
  // Data
  entry: Entry | null;

  // States
  isLoading: boolean;
  isDeleting: boolean;
  error: Error | null;

  // Actions
  updateMealType: (mealType: MealType) => void;
  updateNotes: (notes: string) => void;
  updateRating: (rating: number) => void;
  updateWouldEatAgain: (wouldEatAgain: boolean) => void;
  updateIngredients: (ingredients: string[]) => void;
  updateNutrition: (nutrition: NutritionInfo) => void;
  deleteEntry: () => void;

  // Navigation
  goBack: () => void;
  openPhotoViewer: () => void;
}

export interface UseEntryDetailOptions {
  /** Entry ID to load */
  entryId: string | undefined;
  /** Optional fallback entry for testing/preview */
  fallbackEntry?: Entry;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useEntryDetail(options: UseEntryDetailOptions): UseEntryDetailReturn {
  const { entryId, fallbackEntry } = options;
  const router = useRouter();

  // State
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // =============================================================================
  // LOAD ENTRY
  // =============================================================================

  useEffect(() => {
    const loadEntry = async () => {
      if (!entryId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const entryData = await entryStorageUtils.getEntryById(entryId);

        if (entryData) {
          setEntry(entryData);
        } else if (fallbackEntry) {
          // Use fallback for UI testing
          setEntry(fallbackEntry);
        } else {
          setError(new Error("Entry not found"));
        }
      } catch (err) {
        console.error("Failed to load entry:", err);
        setError(err instanceof Error ? err : new Error("Failed to load entry"));

        // Use fallback on error if available
        if (fallbackEntry) {
          setEntry(fallbackEntry);
          setError(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadEntry();
  }, [entryId, fallbackEntry]);

  // =============================================================================
  // UPDATE HELPERS
  // =============================================================================

  const updateEntry = useCallback(
    async (updates: Partial<Entry>) => {
      if (!entryId || !entry) return;

      try {
        const updatedEntry = await entryStorageUtils.updateEntry(entryId, updates);
        setEntry(updatedEntry);
      } catch (err) {
        console.error("Failed to update entry:", err);
        setError(err instanceof Error ? err : new Error("Failed to update entry"));
      }
    },
    [entryId, entry]
  );

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const updateMealType = useCallback(
    (mealType: MealType) => {
      if (!entry) return;
      updateEntry({
        meal: {
          ...entry.meal,
          mealType,
        },
      });
    },
    [entry, updateEntry]
  );

  const updateNotes = useCallback(
    (notes: string) => {
      updateEntry({ notes });
    },
    [updateEntry]
  );

  const updateRating = useCallback(
    (rating: number) => {
      updateEntry({ rating });
    },
    [updateEntry]
  );

  const updateWouldEatAgain = useCallback(
    (wouldEatAgain: boolean) => {
      updateEntry({ wouldEatAgain });
    },
    [updateEntry]
  );

  const updateIngredients = useCallback(
    (ingredients: string[]) => {
      if (!entry) return;
      updateEntry({
        meal: {
          ...entry.meal,
          ingredients,
        },
      });
    },
    [entry, updateEntry]
  );

  const updateNutrition = useCallback(
    (nutrition: NutritionInfo) => {
      if (!entry) return;
      updateEntry({
        meal: {
          ...entry.meal,
          nutrition,
        },
      });
    },
    [entry, updateEntry]
  );

  const deleteEntry = useCallback(() => {
    Alert.alert(
      "기록 삭제",
      "이 식사 기록을 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            if (!entryId) return;

            setIsDeleting(true);
            try {
              await entryStorageUtils.deleteEntry(entryId);
              router.back();
            } catch (err) {
              console.error("Failed to delete entry:", err);
              Alert.alert("오류", "삭제에 실패했습니다. 다시 시도해주세요.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [entryId, router]);

  // =============================================================================
  // NAVIGATION
  // =============================================================================

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const openPhotoViewer = useCallback(() => {
    // TODO: Open fullscreen photo viewer or change photo
    console.log("Photo pressed - implement fullscreen viewer");
  }, []);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    // Data
    entry,

    // States
    isLoading,
    isDeleting,
    error,

    // Actions
    updateMealType,
    updateNotes,
    updateRating,
    updateWouldEatAgain,
    updateIngredients,
    updateNutrition,
    deleteEntry,

    // Navigation
    goBack,
    openPhotoViewer,
  };
}

import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { Entry } from "@/entities/entry";
import { MealType, type NutritionInfo } from "@/entities/meal";
import {
  entryStorageUtils,
  useEntryDetailQuery,
  useUpdateEntryMutation,
  useSyncIngredientsMutation,
  useUpsertNutritionMutation,
  useDeleteEntryMutation,
} from "@/entities/entry";
import { mapEntryToUpdateRequest, mapNutritionInfoToUpsertRequest } from "@/shared/api";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { useDiaryI18n, useCommonI18n, useErrorI18n } from "@/shared/lib/i18n";

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
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useEntryDetail(options: UseEntryDetailOptions): UseEntryDetailReturn {
  const { entryId } = options;
  const router = useRouter();
  const diary = useDiaryI18n();
  const common = useCommonI18n();
  const errors = useErrorI18n();
  const isAuthenticated = useIsAuthenticated();

  // Determine if this is an API entry (numeric ID) vs MMKV entry
  const numericId = entryId ? Number(entryId) : NaN;
  const isApiEntry = isAuthenticated && !isNaN(numericId) && numericId > 0;

  // =============================================================================
  // API HOOKS (always called, conditionally enabled)
  // =============================================================================

  const apiDetailQuery = useEntryDetailQuery(numericId, isApiEntry);
  const updateEntryMutation = useUpdateEntryMutation();
  const syncIngredientsMutation = useSyncIngredientsMutation();
  const upsertNutritionMutation = useUpsertNutritionMutation();
  const deleteEntryMutation = useDeleteEntryMutation();

  // =============================================================================
  // GUEST (MMKV) STATE
  // =============================================================================

  const [guestEntry, setGuestEntry] = useState<Entry | null>(null);
  const [guestLoading, setGuestLoading] = useState(!isApiEntry);
  const [guestError, setGuestError] = useState<Error | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isApiEntry || !entryId) {
      setGuestLoading(false);
      return;
    }

    let cancelled = false;
    setGuestLoading(true);
    setGuestError(null);

    (async () => {
      try {
        const data = await entryStorageUtils.getEntryById(entryId);
        if (cancelled) return;
        if (data) {
          setGuestEntry(data);
        } else {
          setGuestError(new Error("Entry not found"));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load entry:", err);
        setGuestError(err instanceof Error ? err : new Error("Failed to load entry"));
      } finally {
        if (!cancelled) setGuestLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [entryId, isApiEntry]);

  // =============================================================================
  // DEFERRED NOTES REFS (API path only)
  // =============================================================================

  const originalNotesRef = useRef<string | null>(null);
  const pendingNotesRef = useRef<string | null>(null);
  const flushNotesRef = useRef<() => void>(() => {});

  // =============================================================================
  // UNIFIED DATA
  // =============================================================================

  const rawEntry = isApiEntry ? (apiDetailQuery.data ?? null) : guestEntry;
  const entry = rawEntry && pendingNotesRef.current !== null
    ? { ...rawEntry, notes: pendingNotesRef.current }
    : rawEntry;
  const isLoading = isApiEntry ? apiDetailQuery.isLoading : guestLoading;
  const error = isApiEntry ? (apiDetailQuery.error ?? null) : guestError;

  // Keep a ref to the latest entry for callbacks
  const entryRef = useRef(entry);
  entryRef.current = entry;

  // =============================================================================
  // GUEST UPDATE HELPER
  // =============================================================================

  const updateGuestEntry = useCallback(
    async (updates: Partial<Entry>) => {
      if (!entryId) return;
      try {
        const updatedEntry = await entryStorageUtils.updateEntry(entryId, updates);
        setGuestEntry(updatedEntry);
      } catch (err) {
        console.error("Failed to update entry:", err);
        setGuestError(err instanceof Error ? err : new Error("Failed to update entry"));
      }
    },
    [entryId]
  );

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const updateMealType = useCallback(
    (mealType: MealType) => {
      const current = entryRef.current;
      if (!current) return;

      if (isApiEntry) {
        updateEntryMutation.mutate({
          id: numericId,
          body: mapEntryToUpdateRequest({ meal: { ...current.meal, mealType } }),
        });
      } else {
        updateGuestEntry({ meal: { ...current.meal, mealType } });
      }
    },
    [isApiEntry, numericId, updateEntryMutation, updateGuestEntry]
  );

  const updateNotes = useCallback(
    (notes: string) => {
      if (isApiEntry) {
        pendingNotesRef.current = notes;
      } else {
        updateGuestEntry({ notes });
      }
    },
    [isApiEntry, updateGuestEntry]
  );

  const updateRating = useCallback(
    (rating: number) => {
      if (isApiEntry) {
        updateEntryMutation.mutate({
          id: numericId,
          body: mapEntryToUpdateRequest({ rating }),
        });
      } else {
        updateGuestEntry({ rating });
      }
    },
    [isApiEntry, numericId, updateEntryMutation, updateGuestEntry]
  );

  const updateWouldEatAgain = useCallback(
    (wouldEatAgain: boolean) => {
      if (isApiEntry) {
        updateEntryMutation.mutate({
          id: numericId,
          body: mapEntryToUpdateRequest({ wouldEatAgain }),
        });
      } else {
        updateGuestEntry({ wouldEatAgain });
      }
    },
    [isApiEntry, numericId, updateEntryMutation, updateGuestEntry]
  );

  const updateIngredients = useCallback(
    (ingredients: string[]) => {
      const current = entryRef.current;
      if (!current) return;

      if (isApiEntry) {
        syncIngredientsMutation.mutate({
          entryId: numericId,
          ingredientNames: ingredients,
        });
      } else {
        updateGuestEntry({ meal: { ...current.meal, ingredients } });
      }
    },
    [isApiEntry, numericId, syncIngredientsMutation, updateGuestEntry]
  );

  const updateNutrition = useCallback(
    (nutrition: NutritionInfo) => {
      const current = entryRef.current;
      if (!current) return;

      if (isApiEntry) {
        upsertNutritionMutation.mutate({
          entryId: numericId,
          body: mapNutritionInfoToUpsertRequest(nutrition),
        });
      } else {
        updateGuestEntry({ meal: { ...current.meal, nutrition } });
      }
    },
    [isApiEntry, numericId, upsertNutritionMutation, updateGuestEntry]
  );

  const deleteEntry = useCallback(() => {
    Alert.alert(
      diary.deleteEntryTitle,
      diary.deleteEntryMessage,
      [
        { text: common.cancel, style: "cancel" },
        {
          text: common.delete,
          style: "destructive",
          onPress: async () => {
            if (!entryId) return;

            setIsDeleting(true);
            try {
              if (isApiEntry) {
                await deleteEntryMutation.mutateAsync(numericId);
              } else {
                await entryStorageUtils.deleteEntry(entryId);
              }
              router.back();
            } catch (err) {
              console.error("Failed to delete entry:", err);
              Alert.alert(common.error, errors.deleteFailed);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [entryId, isApiEntry, numericId, deleteEntryMutation, router, diary.deleteEntryTitle, diary.deleteEntryMessage, common.cancel, common.delete, common.error, errors.deleteFailed]);

  // =============================================================================
  // DEFERRED NOTES: flush closure + unmount + baseline sync
  // =============================================================================

  // Keep flushNotesRef always pointing at a closure with latest values
  flushNotesRef.current = () => {
    if (
      pendingNotesRef.current !== null &&
      pendingNotesRef.current !== originalNotesRef.current
    ) {
      updateEntryMutation.mutate({
        id: numericId,
        body: mapEntryToUpdateRequest({ notes: pendingNotesRef.current }),
      });
    }
  };

  // Flush pending notes on unmount
  useEffect(() => {
    return () => {
      flushNotesRef.current();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush and reset refs when entryId changes (prevents cross-entry contamination)
  useEffect(() => {
    return () => {
      flushNotesRef.current();
      pendingNotesRef.current = null;
      originalNotesRef.current = null;
    };
  }, [entryId]);

  // Sync originalNotesRef with server data when there are no pending edits
  useEffect(() => {
    if (rawEntry && pendingNotesRef.current === null) {
      originalNotesRef.current = rawEntry.notes;
    }
  }, [rawEntry]);

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

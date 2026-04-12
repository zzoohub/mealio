import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, Share, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import type { Entry } from "@/entities/entry";
import { MealType, type NutritionInfo } from "@/entities/meal";
import {
  entryStorageUtils,
  useEntryDetailQuery,
  useUpdateEntryMutation,
  useSyncIngredientsMutation,
  useUpsertNutritionMutation,
  useDeleteEntryMutation,
  photoApi,
  aiAnalysisApi,
} from "@/entities/entry";
import { useAiAnalysisQuery } from "@/entities/entry/model/useAiAnalysisQuery";
import { mapApiAiAnalysisToAIAnalysis } from "@/shared/api/mappers";
import { mapEntryToUpdateRequest, mapNutritionInfoToUpsertRequest, uploadPhoto } from "@/shared/api";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { useDiaryI18n, useCommonI18n, useErrorI18n } from "@/shared/lib/i18n";
import { captureError } from "@/shared/lib/sentry";
import { track } from "@/shared/lib/analytics";
import { CAMERA_SETTINGS, queryKeys } from "@/shared/config";

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export type AiAnalysisStatus = "idle" | "pending" | "processing" | "completed" | "failed";

export interface UseEntryDetailReturn {
  // Data
  entry: Entry | null;

  // States
  isLoading: boolean;
  isDeleting: boolean;
  isAddingPhotos: boolean;
  error: Error | null;

  // AI Analysis
  aiAnalysisStatus: AiAnalysisStatus;
  retryAiAnalysis: () => void;

  // Actions
  updateTimestamp: (timestamp: Date) => void;
  updateMealType: (mealType: MealType) => void;
  updateNotes: (notes: string) => void;
  updateRating: (rating: number) => void;
  updateWouldEatAgain: (wouldEatAgain: boolean) => void;
  updateIngredients: (ingredients: string[]) => void;
  updateNutrition: (nutrition: NutritionInfo) => void;
  deleteEntry: () => void;
  addPhotos: () => void;
  shareEntry: () => void;

  // Derived
  canShare: boolean;

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
  const aiAnalysisQuery = useAiAnalysisQuery(numericId, isApiEntry);
  const updateEntryMutation = useUpdateEntryMutation();
  const syncIngredientsMutation = useSyncIngredientsMutation();
  const upsertNutritionMutation = useUpsertNutritionMutation();
  const deleteEntryMutation = useDeleteEntryMutation();

  // =============================================================================
  // GUEST (MMKV) STATE
  // =============================================================================

  const queryClient = useQueryClient();

  const [guestEntry, setGuestEntry] = useState<Entry | null>(null);
  const [guestLoading, setGuestLoading] = useState(!isApiEntry);
  const [guestError, setGuestError] = useState<Error | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingPhotos, setIsAddingPhotos] = useState(false);
  const isAddingPhotosRef = useRef(false);

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
        captureError(err, { tags: { feature: "entry-detail", action: "load_entry" } });
        setGuestError(err instanceof Error ? err : new Error("Failed to load entry"));
      } finally {
        if (!cancelled) setGuestLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [entryId, isApiEntry]);

  // =============================================================================
  // UNIFIED DATA
  // =============================================================================

  const baseEntry = isApiEntry ? (apiDetailQuery.data ?? null) : guestEntry;
  const isLoading = isApiEntry ? apiDetailQuery.isLoading : guestLoading;
  const error = isApiEntry ? (apiDetailQuery.error ?? null) : guestError;

  // AI Analysis — merge into entry when completed
  const aiAnalysisStatus: AiAnalysisStatus = (() => {
    if (!isApiEntry) return "idle";
    const data = aiAnalysisQuery.data;
    if (data) return data.status as AiAnalysisStatus;
    // Show pending during initial load OR background refetch (e.g. revisit after cached 404)
    if (aiAnalysisQuery.isFetching) return "pending";
    return "idle";
  })();

  const entry = (() => {
    if (!baseEntry) return null;
    if (aiAnalysisStatus !== "completed" || !aiAnalysisQuery.data) return baseEntry;

    const aiAnalysis = mapApiAiAnalysisToAIAnalysis(aiAnalysisQuery.data);
    if (!aiAnalysis) return baseEntry;

    return {
      ...baseEntry,
      meal: { ...baseEntry.meal, aiAnalysis },
    };
  })();

  // Keep a ref to the latest entry for callbacks
  const entryRef = useRef(entry);
  entryRef.current = entry;

  // Analytics: track entry_viewed once when entry loads
  const viewTracked = useRef(false);
  useEffect(() => {
    if (entry && !viewTracked.current) {
      viewTracked.current = true;
      track("entry_viewed", {
        entry_id: entry.id,
        has_ai_analysis: aiAnalysisStatus === "completed",
        has_photos: !!(entry.meal.photoUri || entry.meal.photoUris?.length),
        meal_type: entry.meal.mealType,
      });
    }
  }, [entry, aiAnalysisStatus]);

  // Analytics: track AI analysis status transitions
  const prevAiStatus = useRef<AiAnalysisStatus>("idle");
  useEffect(() => {
    if (aiAnalysisStatus === prevAiStatus.current) return;
    const prev = prevAiStatus.current;
    prevAiStatus.current = aiAnalysisStatus;

    if (aiAnalysisStatus === "completed" && prev !== "completed") {
      track("ai_analysis_completed", { entry_id: entryId });
    } else if (aiAnalysisStatus === "failed" && prev !== "failed") {
      track("ai_analysis_failed", { entry_id: entryId });
    }
  }, [aiAnalysisStatus, entryId]);

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
        captureError(err, { tags: { feature: "entry-detail", action: "update_entry" } });
        setGuestError(err instanceof Error ? err : new Error("Failed to update entry"));
      }
    },
    [entryId]
  );

  // =============================================================================
  // GENERIC UPDATE — single branching point for API vs guest
  // =============================================================================

  const updateField = useCallback(
    (updates: Partial<Omit<Entry, "id" | "createdAt">>) => {
      if (isApiEntry) {
        updateEntryMutation.mutate({
          id: numericId,
          body: mapEntryToUpdateRequest(updates),
        });
      } else {
        updateGuestEntry(updates);
      }
    },
    [isApiEntry, numericId, updateEntryMutation, updateGuestEntry],
  );

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const updateTimestamp = useCallback(
    (timestamp: Date) => {
      if (timestamp > new Date()) return;
      updateField({ timestamp });
    },
    [updateField],
  );

  const updateMealType = useCallback(
    (mealType: MealType) => {
      const current = entryRef.current;
      if (!current) return;
      updateField({ meal: { ...current.meal, mealType } });
    },
    [updateField],
  );

  const updateNotes = useCallback(
    (notes: string) => updateField({ notes }),
    [updateField],
  );

  const updateRating = useCallback(
    (rating: number) => updateField({ rating }),
    [updateField],
  );

  const updateWouldEatAgain = useCallback(
    (wouldEatAgain: boolean) => updateField({ wouldEatAgain }),
    [updateField],
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
    [isApiEntry, numericId, syncIngredientsMutation, updateGuestEntry],
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
    [isApiEntry, numericId, upsertNutritionMutation, updateGuestEntry],
  );

  const addPhotos = useCallback(async () => {
    if (isAddingPhotosRef.current) return;
    const current = entryRef.current;
    if (!current || !isApiEntry) return;

    const currentPhotoCount = current.meal.photoUris?.length ?? (current.meal.photoUri ? 1 : 0);
    const remaining = CAMERA_SETTINGS.MAX_PHOTOS_PER_POST - currentPhotoCount;

    if (remaining <= 0) {
      Alert.alert(
        diary.maxPhotosReached,
        diary.maxPhotosMessage(CAMERA_SETTINGS.MAX_PHOTOS_PER_POST),
        [{ text: common.ok }],
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: CAMERA_SETTINGS.DEFAULT_QUALITY,
    });

    if (result.canceled || result.assets.length === 0) return;

    // Filter out oversized files
    const validAssets = result.assets.filter(
      (asset) => !asset.fileSize || asset.fileSize <= CAMERA_SETTINGS.MAX_FILE_SIZE,
    );
    if (validAssets.length === 0) return;

    isAddingPhotosRef.current = true;
    setIsAddingPhotos(true);
    try {
      const uploadedUrls = await Promise.all(
        validAssets.map((asset) => uploadPhoto(asset.uri)),
      );

      await Promise.all(
        uploadedUrls.map((url, i) =>
          photoApi.createPhoto(numericId, {
            url,
            is_primary: false,
            sort_order: currentPhotoCount + i,
          }),
        ),
      );

      track("photos_added_to_entry", {
        entry_id: entryId,
        new_photo_count: validAssets.length,
        total_photo_count: currentPhotoCount + validAssets.length,
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.diary.detail(numericId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.diary.all() });
    } catch (err) {
      captureError(err, { tags: { feature: "entry-detail", action: "add_photos" } });
      Alert.alert(common.error, diary.addPhotoFailed);
    } finally {
      isAddingPhotosRef.current = false;
      setIsAddingPhotos(false);
    }
  }, [isApiEntry, numericId, queryClient, diary, common.ok, common.error]);

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

            track("entry_deleted", { entry_id: entryId });

            setIsDeleting(true);
            try {
              if (isApiEntry) {
                await deleteEntryMutation.mutateAsync(numericId);
              } else {
                await entryStorageUtils.deleteEntry(entryId);
              }
              router.back();
            } catch (err) {
              captureError(err, { tags: { feature: "entry-detail", action: "delete_entry" } });
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
  // SHARE
  // =============================================================================

  const retryAiAnalysis = useCallback(() => {
    if (!isApiEntry) return;
    track("ai_analysis_retried", { entry_id: entryId });
    aiAnalysisApi.trigger(numericId).catch((err) =>
      console.warn("AI analysis retry failed:", err instanceof Error ? err.message : "Unknown error"),
    );
    // Refetch to pick up the new pending status
    aiAnalysisQuery.refetch();
  }, [isApiEntry, numericId, aiAnalysisQuery]);

  const canShare = isApiEntry && !!entry;

  const shareEntry = useCallback(() => {
    if (!isApiEntry || !entry) return;

    track("entry_shared", { entry_id: entryId });

    const url = `https://mealio.zzooapp.com/diary/${numericId}`;
    const message = common.shareEntry;

    if (Platform.OS === "ios") {
      Share.share({ url, message });
    } else {
      Share.share({ message: `${message}\n${url}` });
    }
  }, [isApiEntry, entry, numericId, common.shareEntry]);

  // =============================================================================
  // NAVIGATION
  // =============================================================================

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const openPhotoViewer = useCallback(() => {
    // Placeholder — fullscreen photo viewer not yet implemented
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
    isAddingPhotos,
    error,

    // AI Analysis
    aiAnalysisStatus,
    retryAiAnalysis,

    // Actions
    updateTimestamp,
    updateMealType,
    updateNotes,
    updateRating,
    updateWouldEatAgain,
    updateIngredients,
    updateNutrition,
    deleteEntry,
    addPhotos,
    shareEntry,

    // Derived
    canShare,

    // Navigation
    goBack,
    openPhotoViewer,
  };
}

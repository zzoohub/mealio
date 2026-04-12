import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Entry } from "./types";
import { useIsAuthenticated } from "@/shared/lib/auth";
import { useEntryStorage } from "./useEntryStorage";
import {
  useEntryListQuery,
  useCreateEntryMutation,
  useUpdateEntryMutation,
  useDeleteEntryMutation,
} from "./useEntryQueries";
import {
  mapEntryToCreateRequest,
  mapEntryToUpdateRequest,
  apiMealTypeToEnum,
} from "@/shared/api";
import { uploadPhoto } from "@/shared/api/uploadApi";
import { photoApi } from "../api/photoApi";
import { queryKeys } from "@/shared/config";
import type { ApiDiaryQueryParams, ApiDiaryEntry, ApiMealType } from "@/shared/api";

// =============================================================================
// TYPES
// =============================================================================

export interface UseEntryDataReturn {
  entries: Entry[];
  isLoading: boolean;
  error: string | null;
  /** Returns the created entry ID (string) for auth mode, undefined for guest. */
  saveEntry: (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">, photoUris?: string[]) => Promise<string | undefined>;
  updateEntry: (entryId: string, updates: Partial<Omit<Entry, "id" | "createdAt">>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  entriesRemaining: number;
  isAtGuestLimit: boolean;
  refetch: () => void;
}

interface UseEntryDataOptions {
  date?: string;
  mealType?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function apiEntryToEntry(apiEntry: ApiDiaryEntry): Entry {
  return {
    id: String(apiEntry.id),
    userId: String(apiEntry.user_id),
    timestamp: new Date(apiEntry.eaten_at),
    notes: apiEntry.notes ?? "",
    meal: {
      photoUri: apiEntry.primary_photo_url ?? "",
      mealType: apiMealTypeToEnum(apiEntry.meal_type),
    },
    createdAt: new Date(apiEntry.created_at),
    updatedAt: new Date(apiEntry.updated_at),
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useEntryData(options: UseEntryDataOptions = {}): UseEntryDataReturn {
  const isAuthenticated = useIsAuthenticated();
  const queryClient = useQueryClient();

  // Guest mode: local storage
  const guestStorage = useEntryStorage({ isLoggedIn: isAuthenticated });

  // Auth mode: API queries
  const queryParams: ApiDiaryQueryParams = {};
  if (options.date) {
    queryParams.start_date = options.date;
    queryParams.end_date = options.date;
  }
  if (options.mealType) {
    queryParams.meal_type = options.mealType as ApiMealType;
  }

  const diaryQuery = useEntryListQuery(queryParams, isAuthenticated);
  const createMutation = useCreateEntryMutation();
  const updateMutation = useUpdateEntryMutation();
  const deleteMutation = useDeleteEntryMutation();

  // Map API entries to mobile Entry type
  const apiEntries = useMemo(() => {
    if (!isAuthenticated || !diaryQuery.data) return [];
    return diaryQuery.data.data.map(apiEntryToEntry);
  }, [isAuthenticated, diaryQuery.data]);

  const entries = isAuthenticated ? apiEntries : guestStorage.entries;
  const isLoading = isAuthenticated ? diaryQuery.isLoading : guestStorage.loading;
  const error = isAuthenticated
    ? diaryQuery.error?.message ?? null
    : guestStorage.error;

  const saveEntry = useCallback(
    async (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">, photoUris?: string[]): Promise<string | undefined> => {
      if (isAuthenticated) {
        // 1. Upload photos to R2 in parallel
        const urls = photoUris?.length
          ? await Promise.all(photoUris.map(uploadPhoto))
          : [];

        // 2. Create diary entry
        const req = mapEntryToCreateRequest(entry);
        const created = await createMutation.mutateAsync(req);

        // 3. Attach photos to entry
        for (let i = 0; i < urls.length; i++) {
          await photoApi.createPhoto(created.id, {
            url: urls[i]!,
            is_primary: i === 0,
            sort_order: i,
          });
        }

        // 4. Re-invalidate so queries reflect the attached photos
        if (urls.length > 0) {
          queryClient.invalidateQueries({ queryKey: queryKeys.diary.all() });
        }

        return String(created.id);
      } else {
        const saved = await guestStorage.saveEntry(entry);
        return saved.id;
      }
    },
    [isAuthenticated, createMutation, guestStorage, queryClient],
  );

  const updateEntryFn = useCallback(
    async (entryId: string, updates: Partial<Omit<Entry, "id" | "createdAt">>) => {
      if (isAuthenticated) {
        const body = mapEntryToUpdateRequest(updates);
        await updateMutation.mutateAsync({ id: Number(entryId), body });
      } else {
        await guestStorage.updateEntry(entryId, updates);
      }
    },
    [isAuthenticated, updateMutation, guestStorage],
  );

  const deleteEntryFn = useCallback(
    async (entryId: string) => {
      if (isAuthenticated) {
        await deleteMutation.mutateAsync(Number(entryId));
      } else {
        await guestStorage.deleteEntry(entryId);
      }
    },
    [isAuthenticated, deleteMutation, guestStorage],
  );

  const refetch = useCallback(() => {
    if (isAuthenticated) {
      diaryQuery.refetch();
    } else {
      guestStorage.loadEntries();
    }
  }, [isAuthenticated, diaryQuery, guestStorage]);

  return {
    entries,
    isLoading,
    error,
    saveEntry,
    updateEntry: updateEntryFn,
    deleteEntry: deleteEntryFn,
    entriesRemaining: isAuthenticated ? Infinity : guestStorage.entriesRemaining,
    isAtGuestLimit: isAuthenticated ? false : guestStorage.isAtGuestLimit,
    refetch,
  };
}

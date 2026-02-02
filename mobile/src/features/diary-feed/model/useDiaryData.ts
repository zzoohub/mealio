import { useCallback, useMemo } from "react";
import type { Entry } from "@/entities/entry";
import { useAuthStore, selectIsAuthenticated } from "@/features/auth/model/authStore";
import { useEntryStorage } from "./useEntryStorage";
import {
  useDiaryEntriesQuery,
  useCreateDiaryEntryMutation,
  useUpdateDiaryEntryMutation,
  useDeleteDiaryEntryMutation,
} from "./useDiaryQueries";
import {
  mapEntryToCreateRequest,
  mapEntryToUpdateRequest,
} from "@/shared/api";
import type { ApiDiaryQueryParams, ApiDiaryEntry, ApiMealType } from "@/shared/api";
import { MealType } from "@/entities/meal";

// =============================================================================
// TYPES
// =============================================================================

export interface UseDiaryDataReturn {
  entries: Entry[];
  isLoading: boolean;
  error: string | null;
  saveEntry: (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateEntry: (entryId: string, updates: Partial<Omit<Entry, "id" | "createdAt">>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  entriesRemaining: number;
  isAtGuestLimit: boolean;
  refetch: () => void;
}

interface UseDiaryDataOptions {
  date?: string;
  mealType?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function apiEntryToEntry(apiEntry: ApiDiaryEntry): Entry {
  const mealTypeMap: Record<string, MealType> = {
    breakfast: MealType.BREAKFAST,
    lunch: MealType.LUNCH,
    dinner: MealType.DINNER,
    snack: MealType.SNACK,
    dessert: MealType.DESSERT,
    drink: MealType.DRINK,
    other: MealType.OTHER,
  };

  return {
    id: String(apiEntry.id),
    userId: String(apiEntry.user_id),
    timestamp: new Date(apiEntry.eaten_at),
    notes: apiEntry.notes ?? "",
    meal: {
      photoUri: "",
      mealType: mealTypeMap[apiEntry.meal_type] ?? MealType.OTHER,
    },
    createdAt: new Date(apiEntry.created_at),
    updatedAt: new Date(apiEntry.updated_at),
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useDiaryData(options: UseDiaryDataOptions = {}): UseDiaryDataReturn {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

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

  const diaryQuery = useDiaryEntriesQuery(queryParams, isAuthenticated);
  const createMutation = useCreateDiaryEntryMutation();
  const updateMutation = useUpdateDiaryEntryMutation();
  const deleteMutation = useDeleteDiaryEntryMutation();

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
    async (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">) => {
      if (isAuthenticated) {
        const req = mapEntryToCreateRequest(entry);
        await createMutation.mutateAsync(req);
      } else {
        await guestStorage.saveEntry(entry);
      }
    },
    [isAuthenticated, createMutation, guestStorage],
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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config";
import { mapApiDiaryEntryDetailToEntry } from "@/shared/api";
import type { ApiDiaryQueryParams, ApiCreateEntryRequest, ApiUpdateEntryRequest, ApiUpsertNutritionRequest } from "@/shared/api";
import { diaryApi } from "./diaryApi";
import { nutritionApi } from "./nutritionApi";

// =============================================================================
// HELPERS
// =============================================================================

function buildDiaryKeyParams(params: ApiDiaryQueryParams) {
  const result: { date?: string; mealType?: string } = {};
  if (params.start_date) result.date = params.start_date;
  if (params.meal_type) result.mealType = params.meal_type;
  return Object.keys(result).length > 0 ? result : undefined;
}

// =============================================================================
// QUERIES
// =============================================================================

export function useDiaryEntriesQuery(
  params: ApiDiaryQueryParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.diary.list(buildDiaryKeyParams(params)),
    queryFn: () => diaryApi.list(params),
    enabled,
  });
}

export function useDiaryEntryDetailQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.diary.detail(id),
    queryFn: async () => {
      const detail = await diaryApi.getById(id);
      return mapApiDiaryEntryDetailToEntry(detail);
    },
    enabled: enabled && id > 0,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

export function useCreateDiaryEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiCreateEntryRequest) => diaryApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all() });
    },
  });
}

export function useUpdateDiaryEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ApiUpdateEntryRequest }) =>
      diaryApi.update(id, body),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.list() });
    },
  });
}

export function useDeleteDiaryEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => diaryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all() });
    },
  });
}

export function useUpsertNutritionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, body }: { entryId: number; body: ApiUpsertNutritionRequest }) =>
      nutritionApi.upsert(entryId, body),
    onSuccess: (_data, { entryId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.detail(entryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all() });
    },
  });
}

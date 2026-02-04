import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config";
import { mapApiDiaryEntryDetailToEntry } from "@/shared/api";
import type { ApiDiaryQueryParams, ApiCreateEntryRequest, ApiUpdateEntryRequest, ApiUpsertNutritionRequest } from "@/shared/api";
import { entryApi } from "../api/entryApi";
import { ingredientApi } from "../api/ingredientApi";
import { nutritionApi } from "../api/nutritionApi";

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

export function useEntryListQuery(
  params: ApiDiaryQueryParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.diary.list(buildDiaryKeyParams(params)),
    queryFn: () => entryApi.list(params),
    enabled,
  });
}

export function useEntryDetailQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.diary.detail(id),
    queryFn: async () => {
      const detail = await entryApi.getById(id);
      return mapApiDiaryEntryDetailToEntry(detail);
    },
    enabled: enabled && id > 0,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

export function useCreateEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiCreateEntryRequest) => entryApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all() });
    },
  });
}

export function useUpdateEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ApiUpdateEntryRequest }) =>
      entryApi.update(id, body),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.list() });
    },
  });
}

export function useDeleteEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => entryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all() });
    },
  });
}

export function useSyncIngredientsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, ingredientNames }: { entryId: number; ingredientNames: string[] }) => {
      // Deduplicate names (case-insensitive) before resolution
      const uniqueNames = [...new Set(ingredientNames.map((n) => n.trim().toLowerCase()))].filter(Boolean);

      // Resolve ingredient names to IDs (search first, create if not found)
      const resolvedIngredients = await Promise.all(
        uniqueNames.map(async (name) => {
          const result = await ingredientApi.search(name);
          const exact = result.data.find(
            (i) => i.name.toLowerCase() === name.toLowerCase(),
          );
          if (exact) return { ingredient_id: exact.id };
          const created = await ingredientApi.create(name);
          return { ingredient_id: created.id };
        }),
      );

      return ingredientApi.sync(entryId, { ingredients: resolvedIngredients });
    },
    onSuccess: (_data, { entryId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.detail(entryId) });
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

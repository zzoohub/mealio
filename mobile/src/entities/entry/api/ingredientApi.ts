import { apiClient } from "@/shared/api";
import type {
  ApiIngredient,
  ApiPaginatedResponse,
  ApiEntryIngredientWithName,
  ApiSyncIngredientsRequest,
} from "@/shared/api";

export const ingredientApi = {
  search: (q: string) =>
    apiClient.get<ApiPaginatedResponse<ApiIngredient>>(`/ingredients?q=${encodeURIComponent(q)}`),

  create: (name: string) =>
    apiClient.post<ApiIngredient>("/ingredients", { name }),

  sync: (entryId: number, body: ApiSyncIngredientsRequest) =>
    apiClient.put<ApiEntryIngredientWithName[]>(`/diary/${entryId}/ingredients`, body),
};

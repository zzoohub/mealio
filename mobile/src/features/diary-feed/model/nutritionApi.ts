import { apiClient } from "@/shared/api";
import type { ApiUserNutrition, ApiUpsertNutritionRequest } from "@/shared/api";

export const nutritionApi = {
  get: (entryId: number) =>
    apiClient.get<ApiUserNutrition>(`/diary/${entryId}/nutrition`),

  upsert: (entryId: number, body: ApiUpsertNutritionRequest) =>
    apiClient.put<ApiUserNutrition>(`/diary/${entryId}/nutrition`, body),

  delete: (entryId: number) =>
    apiClient.delete<void>(`/diary/${entryId}/nutrition`),
};

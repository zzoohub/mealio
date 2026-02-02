import { apiClient } from "@/shared/api";
import type {
  ApiOverview,
  ApiNutritionStats,
  ApiMealTypeCount,
  ApiTopIngredient,
  ApiStatsParams,
} from "@/shared/api";

function buildQuery(params: ApiStatsParams): string {
  const searchParams = new URLSearchParams();
  if (params.start_date) searchParams.set("start_date", params.start_date);
  if (params.end_date) searchParams.set("end_date", params.end_date);
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export const statisticsApi = {
  overview: (params: ApiStatsParams = {}) =>
    apiClient.get<ApiOverview>(`/statistics/overview${buildQuery(params)}`),

  nutrition: (params: ApiStatsParams = {}) =>
    apiClient.get<ApiNutritionStats>(`/statistics/nutrition${buildQuery(params)}`),

  mealTypes: (params: ApiStatsParams = {}) =>
    apiClient.get<ApiMealTypeCount[]>(`/statistics/meal-types${buildQuery(params)}`),

  topIngredients: (params: ApiStatsParams = {}) =>
    apiClient.get<ApiTopIngredient[]>(`/statistics/top-ingredients${buildQuery(params)}`),
};

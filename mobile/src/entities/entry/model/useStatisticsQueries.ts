import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config";
import type { ApiStatsParams } from "@/shared/api";
import { statisticsApi } from "../api/statisticsApi";

function buildStatsKeyParams(params: ApiStatsParams) {
  const result: { startDate?: string; endDate?: string } = {};
  if (params.start_date) result.startDate = params.start_date;
  if (params.end_date) result.endDate = params.end_date;
  return Object.keys(result).length > 0 ? result : undefined;
}

export function useOverviewQuery(params: ApiStatsParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.statistics.overview(buildStatsKeyParams(params)),
    queryFn: () => statisticsApi.overview(params),
    enabled,
  });
}

export function useNutritionStatsQuery(params: ApiStatsParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.statistics.nutrition(buildStatsKeyParams(params)),
    queryFn: () => statisticsApi.nutrition(params),
    enabled,
  });
}

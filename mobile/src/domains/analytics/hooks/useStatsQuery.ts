import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { TimePeriod, PeriodStats, MetricsDisplayType } from "../stores/analyticsStore";
import { statsAggregationUtils } from "./useStatsAggregation";
import { mealStorageUtils } from "@/domains/diary";

export const useStatsQuery = (period: TimePeriod, metricsType: MetricsDisplayType) => {
  const generateQueryKey = (period: TimePeriod, metricsType: MetricsDisplayType) => [
    "analytics-stats",
    period.type,
    period.startDate?.getTime() || "none",
    period.endDate?.getTime() || "none",
    metricsType,
  ];

  return useSuspenseQuery({
    queryKey: generateQueryKey(period, metricsType),
    queryFn: async (): Promise<PeriodStats> => {
      const meals = await mealStorageUtils.getAllMeals();
      return statsAggregationUtils.calculatePeriodStats(meals, period, metricsType);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

// Hook for prefetching stats
export const usePrefetchStats = () => {
  const queryClient = useQueryClient();

  const prefetchStatsForPeriod = async (period: TimePeriod, metricsType: MetricsDisplayType) => {
    const generateQueryKey = (period: TimePeriod, metricsType: MetricsDisplayType) => [
      "analytics-stats",
      period.type,
      period.startDate?.getTime() || "none",
      period.endDate?.getTime() || "none",
      metricsType,
    ];

    await queryClient.prefetchQuery({
      queryKey: generateQueryKey(period, metricsType),
      queryFn: async (): Promise<PeriodStats> => {
        const meals = await mealStorageUtils.getAllMeals();
        return statsAggregationUtils.calculatePeriodStats(meals, period, metricsType);
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchStatsForPeriod };
};

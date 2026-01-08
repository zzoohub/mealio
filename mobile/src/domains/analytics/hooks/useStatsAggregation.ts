import { useState, useCallback, useRef, useMemo } from "react";
import { Meal } from "@/domains/diary";
import { TimePeriod, PeriodStats } from "../stores/analyticsStore";

interface CacheEntry {
  stats: PeriodStats;
  timestamp: number;
  key: string;
}

interface AggregationContext {
  totalMeals: number;
  totalDays: number;
  uniqueDays: Set<string>;
  nutritionTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
    fiber: number;
  };
}

// Constants
const TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Default daily targets
const DAILY_TARGETS = {
  calories: 2000,
  protein: 120,
  carbs: 250,
  fat: 80,
  water: 8,
  fiber: 25,
};

// Global cache for stats (in a real app, consider using a more sophisticated cache)
const statsCache = new Map<string, CacheEntry>();

// Stats aggregation utility functions
export const statsAggregationUtils = {
  generateCacheKey: (period: TimePeriod, mealsCount: number): string => {
    const { type, startDate, endDate } = period;
    const start = startDate ? startDate.toISOString().split("T")[0] : "none";
    const end = endDate ? endDate.toISOString().split("T")[0] : "none";
    return `${type}-${start}-${end}-${mealsCount}`;
  },

  isValidCacheEntry: (entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < TTL;
  },

  cleanupCache: (): void => {
    const now = Date.now();
    const entries = Array.from(statsCache.entries());

    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp >= TTL) {
        statsCache.delete(key);
      }
    });

    // If still over limit, remove oldest entries
    if (statsCache.size > MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .filter(([key]) => statsCache.has(key)) // Still exists after cleanup
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

      const toDelete = sortedEntries.length - MAX_CACHE_SIZE;
      for (let i = 0; i < toDelete; i++) {
        const entry = sortedEntries[i];
        if (entry) {
          statsCache.delete(entry[0]);
        }
      }
    }
  },

  getPeriodDateRange: (period: TimePeriod): { start: Date; end: Date } => {
    const now = new Date();

    switch (period.type) {
      case "day":
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        return { start: todayStart, end: todayEnd };

      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return { start: weekStart, end: weekEnd };

      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return { start: monthStart, end: monthEnd };

      case "custom":
        const customStart = period.startDate || new Date(now);
        const customEnd = period.endDate || new Date(now);

        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);

        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);

        return { start, end };

      default:
        return statsAggregationUtils.getPeriodDateRange({ type: "day" });
    }
  },

  filterMealsByPeriod: (meals: Meal[], period: TimePeriod): Meal[] => {
    const { start, end } = statsAggregationUtils.getPeriodDateRange(period);

    return meals.filter(meal => {
      const mealTime = meal.timestamp.getTime();
      return mealTime >= start.getTime() && mealTime <= end.getTime();
    });
  },

  buildAggregationContext: (meals: Meal[]): AggregationContext => {
    const uniqueDays = new Set<string>();
    const nutritionTotals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      water: 0,
      fiber: 0,
    };

    meals.forEach(meal => {
      // Track unique days
      const dayKey = meal.timestamp.toDateString();
      uniqueDays.add(dayKey);

      // Accumulate nutrition
      nutritionTotals.calories += meal.nutrition.calories || 0;
      nutritionTotals.protein += meal.nutrition.protein || 0;
      nutritionTotals.carbs += meal.nutrition.carbs || 0;
      nutritionTotals.fat += meal.nutrition.fat || 0;
      nutritionTotals.water += meal.nutrition.water || 0;
      nutritionTotals.fiber += meal.nutrition.fiber || 0;
    });

    return {
      totalMeals: meals.length,
      totalDays: Math.max(uniqueDays.size, 1), // Prevent division by zero
      uniqueDays,
      nutritionTotals,
    };
  },

  calculateTargetsForPeriod: (period: TimePeriod, totalDays: number): typeof DAILY_TARGETS => {
    switch (period.type) {
      case "day":
        return { ...DAILY_TARGETS };

      case "week":
      case "custom":
        // For week and custom ranges, multiply by total days
        return {
          calories: DAILY_TARGETS.calories * totalDays,
          protein: DAILY_TARGETS.protein * totalDays,
          carbs: DAILY_TARGETS.carbs * totalDays,
          fat: DAILY_TARGETS.fat * totalDays,
          water: DAILY_TARGETS.water * totalDays,
          fiber: DAILY_TARGETS.fiber * totalDays,
        };

      case "month":
        // For month, we show daily averages, so keep daily targets
        return { ...DAILY_TARGETS };

      default:
        return { ...DAILY_TARGETS };
    }
  },

  getPeriodLabel: (period: TimePeriod): string => {
    const now = new Date();

    switch (period.type) {
      case "day":
        return now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });

      case "week":
        const { start, end } = statsAggregationUtils.getPeriodDateRange(period);
        return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" },
        )}`;

      case "month":
        return now.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

      case "custom":
        if (period.startDate && period.endDate) {
          return `${period.startDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })} - ${period.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        }
        if (period.startDate) {
          return `From ${period.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        }
        if (period.endDate) {
          return `Until ${period.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        }
        return "Custom Range";

      default:
        return "Today";
    }
  },

  getMetricsType: (period: TimePeriod, totalDays: number): "total" | "average" | "dailyAverage" => {
    switch (period.type) {
      case "day":
        return "total";
      case "week":
        return totalDays <= 7 ? "total" : "dailyAverage";
      case "month":
        return "dailyAverage";
      case "custom":
        if (totalDays <= 1) return "total";
        if (totalDays <= 7) return "total";
        return "dailyAverage";
      default:
        return "total";
    }
  },

  /**
   * Aggregates meal statistics for a given period with caching and performance optimization
   */
  calculatePeriodStats: async (
    meals: Meal[],
    period: TimePeriod,
    userMetricsType?: "total" | "dailyAverage",
  ): Promise<PeriodStats> => {
    // Check cache first
    const cacheKey = statsAggregationUtils.generateCacheKey(period, meals.length) + `-${userMetricsType || "auto"}`;
    const cachedEntry = statsCache.get(cacheKey);

    if (cachedEntry && statsAggregationUtils.isValidCacheEntry(cachedEntry)) {
      return cachedEntry.stats;
    }

    // Clean up cache periodically
    if (statsCache.size > MAX_CACHE_SIZE * 0.8) {
      statsAggregationUtils.cleanupCache();
    }

    try {
      // Filter meals for the period
      const periodMeals = statsAggregationUtils.filterMealsByPeriod(meals, period);

      // Build aggregation context
      const context = statsAggregationUtils.buildAggregationContext(periodMeals);

      // Calculate targets based on period
      const targets = statsAggregationUtils.calculateTargetsForPeriod(period, context.totalDays);

      // Determine metrics type - use user preference if provided, otherwise fall back to automatic logic
      const metricsType = userMetricsType || statsAggregationUtils.getMetricsType(period, context.totalDays);

      // Calculate current values based on metrics type
      let currentValues = { ...context.nutritionTotals };

      if (metricsType === "dailyAverage") {
        currentValues = {
          calories: context.nutritionTotals.calories / context.totalDays,
          protein: context.nutritionTotals.protein / context.totalDays,
          carbs: context.nutritionTotals.carbs / context.totalDays,
          fat: context.nutritionTotals.fat / context.totalDays,
          water: context.nutritionTotals.water / context.totalDays,
          fiber: context.nutritionTotals.fiber / context.totalDays,
        };
      }

      const stats: PeriodStats = {
        calories: {
          current: Math.round(currentValues.calories),
          target: targets.calories,
        },
        protein: {
          current: Math.round(currentValues.protein),
          target: targets.protein,
        },
        carbs: {
          current: Math.round(currentValues.carbs),
          target: targets.carbs,
        },
        fat: {
          current: Math.round(currentValues.fat),
          target: targets.fat,
        },
        water: {
          current: Math.round(currentValues.water * 10) / 10, // One decimal place
          target: targets.water,
        },
        fiber: {
          current: Math.round(currentValues.fiber),
          target: targets.fiber,
        },
        periodType: period.type,
        periodLabel: statsAggregationUtils.getPeriodLabel(period),
        metricsType,
      };

      // Cache the result
      const cacheEntry: CacheEntry = {
        stats,
        timestamp: Date.now(),
        key: cacheKey,
      };

      statsCache.set(cacheKey, cacheEntry);

      return stats;
    } catch (error) {
      console.error("Error calculating period stats:", error);

      // Return fallback stats
      return statsAggregationUtils.getFallbackStats(period);
    }
  },

  getFallbackStats: (period: TimePeriod): PeriodStats => {
    return {
      calories: { current: 0, target: DAILY_TARGETS.calories },
      protein: { current: 0, target: DAILY_TARGETS.protein },
      carbs: { current: 0, target: DAILY_TARGETS.carbs },
      fat: { current: 0, target: DAILY_TARGETS.fat },
      water: { current: 0, target: DAILY_TARGETS.water },
      fiber: { current: 0, target: DAILY_TARGETS.fiber },
      periodType: period.type,
      periodLabel: statsAggregationUtils.getPeriodLabel(period),
      metricsType: "total",
    };
  },

  /**
   * Clears all cached statistics
   */
  clearCache: (): void => {
    statsCache.clear();
  },

  /**
   * Gets current cache statistics
   */
  getCacheStats: (): { size: number; hitRate: number } => {
    // This is a simplified hit rate calculation
    // In a real implementation, you'd track hits vs misses
    return {
      size: statsCache.size,
      hitRate: 0.75, // Placeholder value
    };
  },

  /**
   * Pre-calculates stats for common periods to improve performance
   */
  preloadCommonPeriods: async (meals: Meal[]): Promise<void> => {
    const commonPeriods: TimePeriod[] = [{ type: "day" }, { type: "week" }, { type: "month" }];

    // Calculate in parallel but don't wait for completion
    Promise.all(
      commonPeriods.map(period =>
        statsAggregationUtils.calculatePeriodStats(meals, period).catch(error => {
          console.warn("Failed to preload period stats:", period.type, error);
        }),
      ),
    ).catch(() => {
      // Ignore preload failures
    });
  },
};

// Custom hook for stats aggregation functionality
export const useStatsAggregation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(statsCache);

  const calculatePeriodStats = useCallback(
    async (meals: Meal[], period: TimePeriod, userMetricsType?: "total" | "dailyAverage") => {
      setLoading(true);
      setError(null);

      try {
        const result = await statsAggregationUtils.calculatePeriodStats(meals, period, userMetricsType);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to calculate stats";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const preloadCommonPeriods = useCallback(async (meals: Meal[]) => {
    try {
      await statsAggregationUtils.preloadCommonPeriods(meals);
    } catch (err) {
      console.warn("Failed to preload common periods:", err);
    }
  }, []);

  const clearCache = useCallback(() => {
    statsAggregationUtils.clearCache();
  }, []);

  const getCacheStats = useCallback(() => {
    return statsAggregationUtils.getCacheStats();
  }, []);

  const getPeriodLabel = useCallback((period: TimePeriod) => {
    return statsAggregationUtils.getPeriodLabel(period);
  }, []);

  return {
    loading,
    error,
    calculatePeriodStats,
    preloadCommonPeriods,
    clearCache,
    getCacheStats,
    getPeriodLabel,
    // Direct access to utils for advanced usage
    utils: statsAggregationUtils,
  };
};

export default statsAggregationUtils;

/**
 * StatsSuspenseWrapper - Suspense boundary for stats loading
 *
 * Wraps the stats query component with Suspense to show a skeleton
 * loader while data is being fetched. Also handles prefetching of
 * other periods for smooth transitions.
 *
 * @example
 * ```tsx
 * <StatsSuspenseWrapper onNavigate={handleNavigate} />
 * ```
 */

import React, { Suspense, useEffect } from "react";
import { useStatsQuery, usePrefetchStats } from "../hooks/useStatsQuery";
import { StatsSkeleton } from "@/components/SkeletonLoader";
import { useAnalyticsStore, TimePeriod } from "../stores/analyticsStore";
import { StatsContent } from "./StatsContent";

// =============================================================================
// TYPES
// =============================================================================

interface StatsSuspenseWrapperProps {
  onNavigate: (section: string) => void;
}

// =============================================================================
// INNER QUERY COMPONENT
// =============================================================================

function StatsQueryComponent({ onNavigate }: StatsSuspenseWrapperProps) {
  const { globalPeriod, metricsDisplayType } = useAnalyticsStore();
  const { data: currentStats } = useStatsQuery(globalPeriod, metricsDisplayType);
  const { prefetchStatsForPeriod } = usePrefetchStats();

  // Prefetch other periods for smooth transitions
  useEffect(() => {
    const prefetchOtherPeriods = async () => {
      const periodsToPreload: TimePeriod[] = [
        { type: "day" },
        { type: "week" },
        { type: "month" },
      ];

      // Prefetch other periods and metric types in background
      for (const period of periodsToPreload) {
        if (period.type !== globalPeriod.type) {
          // Prefetch both total and dailyAverage for non-current periods
          await prefetchStatsForPeriod(period, "total");
          await prefetchStatsForPeriod(period, "dailyAverage");
        }
      }
    };

    // Prefetch after a short delay to not block current rendering
    const prefetchTimer = setTimeout(prefetchOtherPeriods, 300);
    return () => clearTimeout(prefetchTimer);
  }, [globalPeriod, metricsDisplayType, prefetchStatsForPeriod]);

  return <StatsContent stats={currentStats} onNavigate={onNavigate} />;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function StatsSuspenseWrapper({ onNavigate }: StatsSuspenseWrapperProps) {
  return (
    <Suspense fallback={<StatsSkeleton />}>
      <StatsQueryComponent onNavigate={onNavigate} />
    </Suspense>
  );
}

export default StatsSuspenseWrapper;

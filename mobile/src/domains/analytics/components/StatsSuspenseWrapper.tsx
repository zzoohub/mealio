import React, { Suspense, useEffect } from "react";
import { useStatsQuery, usePrefetchStats } from "../hooks/useStatsQuery";
import { StatsSkeleton } from "@/components/SkeletonLoader";
import { useAnalyticsStore, TimePeriod } from "../stores/analyticsStore";
import { StatsContent } from "./StatsContent";

interface StatsSuspenseWrapperProps {
  onNavigate: (section: string) => void;
}

function StatsQueryComponent({ onNavigate }: StatsSuspenseWrapperProps) {
  const { globalPeriod, metricsDisplayType } = useAnalyticsStore();
  const { data: currentStats } = useStatsQuery(globalPeriod, metricsDisplayType);
  const { prefetchStatsForPeriod } = usePrefetchStats();

  // Prefetch other periods for smooth transitions
  useEffect(() => {
    const prefetchOtherPeriods = async () => {
      const periodsToPreload: TimePeriod[] = [{ type: "day" }, { type: "week" }, { type: "month" }];

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

export function StatsSuspenseWrapper({ onNavigate }: StatsSuspenseWrapperProps) {
  return (
    <Suspense fallback={<StatsSkeleton />}>
      <StatsQueryComponent onNavigate={onNavigate} />
    </Suspense>
  );
}

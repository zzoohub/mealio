// Store exports
export {
  useAnalyticsStore,
  selectCurrentPeriodLabel,
  selectIsCurrentPeriod,
  type TimePeriod,
  type PeriodStats,
  type SortMethod,
  type MetricsDisplayType
} from './stores/analyticsStore';

// Hook exports
export { useStatsAggregation, statsAggregationUtils } from './hooks/useStatsAggregation';
export { useStatsQuery, usePrefetchStats } from './hooks/useStatsQuery';
export { useAnalyticsDashboard } from './hooks/useAnalyticsDashboard';
export type { UseAnalyticsDashboardReturn, CalendarRangeState } from './hooks/useAnalyticsDashboard';

// Component exports
export { default as AnalyticsDashboard } from './components/AnalyticsDashboard';
export { StatsContent } from './components/StatsContent';
export { StatsSuspenseWrapper } from './components/StatsSuspenseWrapper';
export { PeriodSelector } from './components/PeriodSelector';
export { ProgressRing } from './components/ProgressRing';
export { AchievementCard } from './components/AchievementCard';
export { InsightCard } from './components/InsightCard';
export type { PeriodSelectorProps } from './components/PeriodSelector';
export type { ProgressRingProps } from './components/ProgressRing';
export type { Achievement, AchievementCardProps } from './components/AchievementCard';
export type { InsightCardProps } from './components/InsightCard';

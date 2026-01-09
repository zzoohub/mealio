/**
 * StatsContent - Period statistics display component
 *
 * Displays calorie summary and progress for a given time period.
 * Supports toggling between total and daily average views.
 *
 * @example
 * ```tsx
 * <StatsContent stats={periodStats} onNavigate={handleNavigate} />
 * ```
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAnalyticsI18n } from "@/lib/i18n";
import { useAnalyticsStore, PeriodStats } from "../stores/analyticsStore";
import { createStyles, useStyles } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

interface StatsContentProps {
  stats: PeriodStats;
  onNavigate: (section: string) => void;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ToggleButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function ToggleButton({ label, isActive, onPress }: ToggleButtonProps) {
  const s = useStyles(toggleButtonStyles);

  return (
    <TouchableOpacity
      style={[
        styles.toggleButton,
        isActive ? s.active : s.inactive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.toggleText,
          isActive ? s.activeText : s.inactiveText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function StatsContent({ stats, onNavigate }: StatsContentProps) {
  const s = useStyles(statsContentStyles);
  const analytics = useAnalyticsI18n();
  const { globalPeriod, metricsDisplayType, setMetricsDisplayType } = useAnalyticsStore();

  const remaining = Math.max(0, stats.calories.target - stats.calories.current);
  const progressPercentage = Math.min((stats.calories.current / stats.calories.target) * 100, 100);

  return (
    <View style={[styles.summaryCard, s.summaryCard]}>
      <View style={styles.summaryHeader}>
        <Text style={[styles.summaryTitle, s.summaryTitle]}>
          {globalPeriod.type === "day" ? analytics.todaySummary : "Period Summary"}
        </Text>
        {globalPeriod.type !== "day" && (
          <View style={[styles.toggleContainer, s.toggleContainer]}>
            <ToggleButton
              label="Total"
              isActive={metricsDisplayType === "total"}
              onPress={() => setMetricsDisplayType("total")}
            />
            <ToggleButton
              label="Avg"
              isActive={metricsDisplayType === "dailyAverage"}
              onPress={() => setMetricsDisplayType("dailyAverage")}
            />
          </View>
        )}
      </View>

      <Text style={[styles.summaryDate, s.summaryDate]}>{stats.periodLabel}</Text>

      <View style={styles.calorieOverview}>
        <View style={styles.calorieMain}>
          <Text style={[styles.calorieValue, s.calorieValue]}>
            {Math.round(stats.calories.current)}
          </Text>
          <Text style={[styles.calorieLabel, s.calorieLabel]}>
            {stats.metricsType === "dailyAverage" ? "avg calories/day" : "calories consumed"}
          </Text>
        </View>
        <View style={styles.calorieRemaining}>
          <Text style={[styles.remainingValue, s.remainingValue]}>
            {Math.round(remaining)}
          </Text>
          <Text style={[styles.remainingLabel, s.remainingLabel]}>
            {stats.metricsType === "dailyAverage" ? "avg remaining" : analytics.remaining}
          </Text>
        </View>
      </View>

      <View style={[styles.progressBar, s.progressBar]}>
        <View
          style={[
            styles.progressFill,
            s.progressFill,
            { width: `${progressPercentage}%` as any },
          ]}
        />
      </View>
    </View>
  );
}

// =============================================================================
// STATIC STYLES (non-themed)
// =============================================================================

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.layout.sm,
    marginBottom: tokens.spacing.layout.sm,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: tokens.spacing.component.xs,
  },
  summaryTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  summaryDate: {
    fontSize: tokens.typography.fontSize.bodySmall,
    marginBottom: tokens.spacing.component.lg,
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: tokens.radius.sm,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: tokens.spacing.component.sm,
    paddingVertical: tokens.spacing.component.xs,
    borderRadius: tokens.radius.sm,
    minWidth: 36,
    alignItems: "center",
  },
  toggleText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  calorieOverview: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: tokens.spacing.component.lg,
  },
  calorieMain: {
    alignItems: "flex-start",
  },
  calorieValue: {
    fontSize: tokens.typography.fontSize.display,
    fontWeight: tokens.typography.fontWeight.bold,
  },
  calorieLabel: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
  calorieRemaining: {
    alignItems: "flex-end",
  },
  remainingValue: {
    fontSize: tokens.typography.fontSize.h2,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  remainingLabel: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
  progressBar: {
    height: 8,
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
});

export default StatsContent;

// =============================================================================
// THEMED STYLES
// =============================================================================

const toggleButtonStyles = createStyles((colors) => ({
  active: {
    backgroundColor: colors.interactive.primary,
  },
  inactive: {
    backgroundColor: "transparent" as const,
  },
  activeText: {
    color: colors.text.inverse,
  },
  inactiveText: {
    color: colors.text.secondary,
  },
}));

const statsContentStyles = createStyles((colors) => ({
  summaryCard: {
    backgroundColor: colors.bg.elevated,
  },
  summaryTitle: {
    color: colors.text.primary,
  },
  summaryDate: {
    color: colors.text.secondary,
  },
  toggleContainer: {
    backgroundColor: colors.bg.primary,
  },
  calorieValue: {
    color: colors.text.primary,
  },
  calorieLabel: {
    color: colors.text.secondary,
  },
  remainingValue: {
    color: colors.interactive.primary,
  },
  remainingLabel: {
    color: colors.text.secondary,
  },
  progressBar: {
    backgroundColor: colors.border.subtle,
  },
  progressFill: {
    backgroundColor: colors.interactive.primary,
  },
}));

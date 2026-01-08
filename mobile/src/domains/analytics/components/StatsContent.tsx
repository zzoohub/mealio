import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { CircularProgress } from "@/components/CircularProgress";
import { useTheme } from "@/lib/theme";
import { useAnalyticsI18n } from "@/lib/i18n";
import { useAnalyticsStore, PeriodStats } from "../stores/analyticsStore";

interface StatsContentProps {
  stats: PeriodStats;
  onNavigate: (section: string) => void;
}

export function StatsContent({ stats, onNavigate }: StatsContentProps) {
  const { theme } = useTheme();
  const analytics = useAnalyticsI18n();
  const { globalPeriod, metricsDisplayType, setMetricsDisplayType } = useAnalyticsStore();

  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.summaryHeader}>
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
          {globalPeriod.type === "day" ? analytics.todaySummary : "Period Summary"}
        </Text>
        {globalPeriod.type !== "day" && (
          <View style={[styles.inlineToggleButtons, { backgroundColor: theme.colors.background }]}>
            <TouchableOpacity
              style={[
                styles.inlineToggleButton,
                metricsDisplayType === "total" && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setMetricsDisplayType("total")}
            >
              <Text
                style={[
                  styles.inlineToggleText,
                  { color: theme.colors.textSecondary },
                  metricsDisplayType === "total" && { color: "white" },
                ]}
              >
                Total
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.inlineToggleButton,
                metricsDisplayType === "dailyAverage" && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setMetricsDisplayType("dailyAverage")}
            >
              <Text
                style={[
                  styles.inlineToggleText,
                  { color: theme.colors.textSecondary },
                  metricsDisplayType === "dailyAverage" && { color: "white" },
                ]}
              >
                Avg
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={[styles.summaryDate, { color: theme.colors.textSecondary }]}>{stats.periodLabel}</Text>

      <View style={styles.calorieOverview}>
        <View style={styles.calorieMain}>
          <Text style={[styles.calorieValue, { color: theme.colors.text }]}>{Math.round(stats.calories.current)}</Text>
          <Text style={[styles.calorieLabel, { color: theme.colors.textSecondary }]}>
            {stats.metricsType === "dailyAverage" ? "avg calories/day" : "calories consumed"}
          </Text>
        </View>
        <View style={styles.calorieRemaining}>
          <Text style={[styles.remainingValue, { color: theme.colors.primary }]}>
            {Math.round(Math.max(0, stats.calories.target - stats.calories.current))}
          </Text>
          <Text style={[styles.remainingLabel, { color: theme.colors.textSecondary }]}>
            {stats.metricsType === "dailyAverage" ? "avg remaining" : analytics.remaining}
          </Text>
        </View>
      </View>

      <View style={[styles.calorieBar, { backgroundColor: theme.colors.border + "40" }]}>
        <View
          style={[
            styles.calorieBarFill,
            {
              width: `${Math.min((stats.calories.current / stats.calories.target) * 100, 100)}%`,
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  summaryDate: {
    fontSize: 14,
    marginBottom: 16,
  },
  inlineToggleButtons: {
    flexDirection: "row",
    borderRadius: 6,
    padding: 1,
  },
  inlineToggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 36,
    alignItems: "center",
  },
  inlineToggleText: {
    fontSize: 10,
    fontWeight: "500",
  },
  calorieOverview: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calorieMain: {
    alignItems: "flex-start",
  },
  calorieValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  calorieLabel: {
    fontSize: 14,
  },
  calorieRemaining: {
    alignItems: "flex-end",
  },
  remainingValue: {
    fontSize: 24,
    fontWeight: "600",
  },
  remainingLabel: {
    fontSize: 14,
  },
  calorieBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  calorieBarFill: {
    height: "100%",
  },
});

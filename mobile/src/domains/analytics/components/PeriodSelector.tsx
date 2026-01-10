import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles, useTheme } from "@/design-system/theme";
import { tokens, iconSizes } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface PeriodSelectorProps {
  currentPeriod: "day" | "week" | "month" | "custom";
  onPeriodChange: (period: "day" | "week" | "month") => void;
  onCalendarPress: () => void;
  labels: {
    day: string;
    week: string;
    month: string;
  };
}

interface PeriodButtonProps {
  period: "day" | "week" | "month";
  isActive: boolean;
  onPress: () => void;
  label: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function PeriodButton({ period, isActive, onPress, label }: PeriodButtonProps) {
  const s = useStyles(periodButtonStyles);

  return (
    <TouchableOpacity
      style={[styles.periodButton, isActive ? s.active : s.inactive]}
      onPress={onPress}
    >
      <Text style={[styles.periodButtonText, isActive ? s.activeText : s.inactiveText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PeriodSelector({
  currentPeriod,
  onPeriodChange,
  onCalendarPress,
  labels,
}: PeriodSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.elevated }]}>
      <View style={styles.buttonsRow}>
        {(["day", "week", "month"] as const).map((period) => (
          <PeriodButton
            key={period}
            period={period}
            isActive={currentPeriod === period}
            onPress={() => onPeriodChange(period)}
            label={labels[period]}
          />
        ))}
        <TouchableOpacity
          style={[
            styles.calendarButton,
            currentPeriod === "custom" && {
              backgroundColor: colors.interactive.primary,
            },
          ]}
          onPress={onCalendarPress}
        >
          <Ionicons
            name="calendar"
            size={iconSizes.xs}
            color={currentPeriod === "custom" ? "white" : colors.text.secondary}
          />
          {currentPeriod === "custom" && (
            <Text style={[styles.calendarButtonText, { color: "white" }]}>Custom</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.component.xs,
    marginBottom: tokens.spacing.layout.sm,
  },
  buttonsRow: {
    flexDirection: "row",
  },
  periodButton: {
    flex: 1,
    paddingVertical: tokens.spacing.component.sm,
    alignItems: "center",
    borderRadius: tokens.radius.sm,
  },
  periodButtonText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  calendarButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.component.xs,
    flex: 1,
    paddingVertical: tokens.spacing.component.sm,
    borderRadius: tokens.radius.sm,
  },
  calendarButtonText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
  },
});

const periodButtonStyles = createStyles((colors) => ({
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

export default PeriodSelector;

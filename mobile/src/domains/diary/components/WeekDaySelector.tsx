import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { isSameDay, getDayName } from "../utils/dateUtils";

// =============================================================================
// TYPES
// =============================================================================

export interface WeekDaySelectorProps {
  weekDays: Date[];
  selectedDate: Date;
  today: Date;
  onDateSelect: (date: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  dateHasEntries: (date: Date) => boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function WeekDaySelector({
  weekDays,
  selectedDate,
  today,
  onDateSelect,
  onPreviousWeek,
  onNextWeek,
  dateHasEntries,
}: WeekDaySelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border.default }]}>
      <TouchableOpacity onPress={onPreviousWeek} style={styles.navButton}>
        <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.weekCalendar}>
        {weekDays.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const hasEntries = dateHasEntries(date);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayItem,
                isSelected && { backgroundColor: colors.interactive.primary },
              ]}
              onPress={() => onDateSelect(date)}
            >
              <Text
                style={[
                  styles.dayName,
                  { color: isSelected ? "white" : colors.text.secondary },
                ]}
              >
                {getDayName(index, "ko")}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  { color: isSelected ? "white" : colors.text.primary },
                  isToday && !isSelected && { color: colors.interactive.primary },
                ]}
              >
                {date.getDate()}
              </Text>
              <View
                style={[
                  styles.entryMarker,
                  {
                    backgroundColor: isSelected ? "white" : colors.interactive.primary,
                    opacity: hasEntries ? 1 : 0,
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity onPress={onNextWeek} style={styles.navButton}>
        <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />
      </TouchableOpacity>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.component.sm,
    paddingBottom: tokens.spacing.component.md,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: tokens.spacing.component.sm,
  },
  weekCalendar: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  dayItem: {
    alignItems: "center",
    paddingVertical: tokens.spacing.component.sm,
    paddingHorizontal: tokens.spacing.component.sm,
    borderRadius: tokens.radius.md,
    minWidth: 36,
  },
  dayName: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
    marginBottom: tokens.spacing.component.xs,
  },
  dayNumber: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  entryMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: tokens.spacing.component.xs,
  },
});

export default WeekDaySelector;

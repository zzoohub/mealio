import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/ui/theme";
import { tokens } from "@/shared/ui/tokens";
import { formatDateToString } from "@/shared/lib/utils";

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_DATE_RANGE_DAYS = 366;

// =============================================================================
// TYPES
// =============================================================================

export interface EntryDateRangeModalProps {
  initialStartDate?: Date | null;
  initialEndDate?: Date | null;
  onApply: (startDate: Date, endDate: Date) => void;
  onPresetSelect: (days: number) => void;
  onClear: () => void;
  onClose: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function buildMarkedDates(
  start: Date | null,
  end: Date | null,
  primaryColor: string,
  textColor: string,
): Record<string, any> {
  const markedDates: Record<string, any> = {};

  if (start && !end) {
    const dateString = formatDateToString(start);
    markedDates[dateString] = {
      startingDay: true,
      endingDay: true,
      color: primaryColor,
      textColor: "white",
    };
  } else if (start && end) {
    const startString = formatDateToString(start);
    const endString = formatDateToString(end);

    if (startString === endString) {
      markedDates[startString] = {
        startingDay: true,
        endingDay: true,
        color: primaryColor,
        textColor: "white",
      };
    } else {
      markedDates[startString] = {
        startingDay: true,
        color: primaryColor,
        textColor: "white",
      };
      markedDates[endString] = {
        endingDay: true,
        color: primaryColor,
        textColor: "white",
      };

      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + 1);
      let iterations = 0;

      while (currentDate < end && iterations < MAX_DATE_RANGE_DAYS) {
        const dateString = formatDateToString(currentDate);
        markedDates[dateString] = {
          color: primaryColor + "40",
          textColor,
        };
        currentDate.setDate(currentDate.getDate() + 1);
        iterations++;
      }
    }
  }

  return markedDates;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryDateRangeModal({
  initialStartDate,
  initialEndDate,
  onApply,
  onPresetSelect,
  onClear,
  onClose,
}: EntryDateRangeModalProps) {
  const { colors } = useTheme();

  // Internal calendar state — isolated from parent's stale closure
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate ?? null);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate ?? null);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>(() =>
    buildMarkedDates(
      initialStartDate ?? null,
      initialEndDate ?? null,
      colors.interactive.primary,
      colors.text.primary,
    )
  );

  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.dateString)) return;
      const selectedDate = new Date(day.dateString + "T12:00:00");
      if (isNaN(selectedDate.getTime())) return;

      const primary = colors.interactive.primary;
      const text = colors.text.primary;

      if (!startDate || (startDate && endDate)) {
        // First tap or resetting
        setStartDate(selectedDate);
        setEndDate(null);
        setMarkedDates(buildMarkedDates(selectedDate, null, primary, text));
      } else if (startDate && !endDate) {
        if (selectedDate >= startDate) {
          // Second tap (>= start): complete range
          setEndDate(selectedDate);
          setMarkedDates(buildMarkedDates(startDate, selectedDate, primary, text));
        } else {
          // Second tap (< start): reset to earlier date
          setStartDate(selectedDate);
          setEndDate(null);
          setMarkedDates(buildMarkedDates(selectedDate, null, primary, text));
        }
      }
    },
    [startDate, endDate, colors.interactive.primary, colors.text.primary]
  );

  const handlePreset = (days: number) => {
    onPresetSelect(days);
    onClose();
  };

  const handleClearAll = () => {
    setStartDate(null);
    setEndDate(null);
    setMarkedDates({});
    onClear();
    onClose();
  };

  const handleClearSelection = () => {
    setStartDate(null);
    setEndDate(null);
    setMarkedDates({});
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onApply(startDate, endDate);
      onClose();
    }
  };

  const hasSelection = startDate || endDate;
  const hasRangeSelected = !!(startDate && endDate);

  return (
    <>
      <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Select Date Range</Text>
        <Pressable onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.text.secondary} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Quick Presets */}
        <View style={[styles.presetsContainer, { borderBottomColor: colors.border.default }]}>
          <Text style={[styles.presetsTitle, { color: colors.text.primary }]}>Quick Select</Text>
          <View style={styles.presetsGrid}>
            <Pressable
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={handleClearAll}
            >
              <Text style={[styles.presetButtonText, { color: colors.text.secondary }]}>All Time</Text>
            </Pressable>
            <Pressable
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => handlePreset(1)}
            >
              <Text style={[styles.presetButtonText, { color: colors.text.secondary }]}>Today</Text>
            </Pressable>
            <Pressable
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => handlePreset(7)}
            >
              <Text style={[styles.presetButtonText, { color: colors.text.secondary }]}>Last 7 Days</Text>
            </Pressable>
            <Pressable
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => handlePreset(30)}
            >
              <Text style={[styles.presetButtonText, { color: colors.text.secondary }]}>Last 30 Days</Text>
            </Pressable>
            <Pressable
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => handlePreset(90)}
            >
              <Text style={[styles.presetButtonText, { color: colors.text.secondary }]}>Last 3 Months</Text>
            </Pressable>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Text style={[styles.calendarTitle, { color: colors.text.primary }]}>Select Date Range</Text>
          <Text style={[styles.calendarInstructions, { color: colors.text.secondary }]}>
            Tap to select start date, tap again to select end date
          </Text>

          <Calendar
            onDayPress={handleDayPress}
            markingType="period"
            markedDates={markedDates}
            theme={{
              calendarBackground: "transparent",
              textSectionTitleColor: colors.text.primary,
              selectedDayBackgroundColor: colors.interactive.primary,
              selectedDayTextColor: "white",
              todayTextColor: colors.interactive.primary,
              dayTextColor: colors.text.primary,
              textDisabledColor: colors.text.secondary,
              dotColor: colors.interactive.primary,
              selectedDotColor: "white",
              arrowColor: colors.interactive.primary,
              disabledArrowColor: colors.text.secondary,
              monthTextColor: colors.text.primary,
              indicatorColor: colors.interactive.primary,
              textDayFontWeight: "400",
              textMonthFontWeight: "600",
              textDayHeaderFontWeight: "500",
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />

          {/* Apply Button */}
          {hasRangeSelected && (
            <Pressable
              style={[styles.applyButton, { backgroundColor: colors.interactive.primary }]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </Pressable>
          )}

          {/* Clear Selection Button */}
          <Pressable
            style={[styles.clearButton, { opacity: hasSelection ? 1 : 0 }]}
            onPress={handleClearSelection}
            disabled={!hasSelection}
          >
            <Ionicons name="trash-outline" size={16} color={colors.text.secondary} />
            <Text style={[styles.clearButtonText, { color: colors.interactive.primary }]}>Clear Selection</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.layout.md,
    paddingVertical: tokens.spacing.component.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  scrollContent: {
    maxHeight: 500,
  },
  presetsContainer: {
    padding: tokens.spacing.layout.md,
    borderBottomWidth: 1,
  },
  presetsTitle: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.md,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.component.md,
  },
  presetButton: {
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.sm,
    borderRadius: tokens.radius.sm,
    minWidth: 80,
  },
  presetButtonText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
    textAlign: "center",
  },
  calendarContainer: {
    padding: tokens.spacing.layout.md,
    paddingBottom: tokens.spacing.layout.lg,
    minHeight: 420,
  },
  calendarTitle: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.sm,
  },
  calendarInstructions: {
    fontSize: tokens.typography.fontSize.bodySmall,
    marginBottom: tokens.spacing.layout.md,
    textAlign: "center",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: tokens.spacing.layout.md,
    paddingVertical: tokens.spacing.component.md,
    gap: tokens.spacing.component.sm,
    minHeight: 44,
  },
  clearButtonText: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
  applyButton: {
    marginTop: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.md,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  applyButtonText: {
    color: "white",
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});

export default EntryDateRangeModal;

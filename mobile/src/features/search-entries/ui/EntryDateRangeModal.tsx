import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/ui/design-system/theme";
import { tokens } from "@/shared/ui/design-system/tokens";
import { CalendarRangeState } from "../model/useEntrySearch";

// =============================================================================
// TYPES
// =============================================================================

export interface EntryDateRangeModalProps {
  calendarRange: CalendarRangeState;
  onDayPress: (day: { dateString: string }) => void;
  onPresetSelect: (days: number) => void;
  onClear: () => void;
  onClose: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryDateRangeModal({
  calendarRange,
  onDayPress,
  onPresetSelect,
  onClear,
  onClose,
}: EntryDateRangeModalProps) {
  const { colors } = useTheme();

  const handlePreset = (days: number) => {
    onPresetSelect(days);
    onClose();
  };

  const handleClearAll = () => {
    onClear();
    onClose();
  };

  const hasSelection = calendarRange.startDate || calendarRange.endDate;

  return (
    <>
      <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Select Date Range</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Quick Presets */}
        <View style={[styles.presetsContainer, { borderBottomColor: colors.border.default }]}>
          <Text style={[styles.presetsTitle, { color: colors.text.primary }]}>Quick Select</Text>
          <View style={styles.presetsGrid}>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={handleClearAll}
            >
              <Text style={[styles.presetButtonText, { color: colors.text.secondary }]}>All Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => handlePreset(1)}
            >
              <Text style={[styles.presetButtonText, { color: colors.text.secondary }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => handlePreset(7)}
            >
              <Text style={[styles.presetButtonText, { color: colors.text.secondary }]}>Last 7 Days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => handlePreset(30)}
            >
              <Text style={[styles.presetButtonText, { color: colors.text.secondary }]}>Last 30 Days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: colors.bg.secondary }]}
              onPress={() => handlePreset(90)}
            >
              <Text style={[styles.presetButtonText, { color: colors.text.secondary }]}>Last 3 Months</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Text style={[styles.calendarTitle, { color: colors.text.primary }]}>Select Date Range</Text>
          <Text style={[styles.calendarInstructions, { color: colors.text.secondary }]}>
            Tap to select start date, tap again to select end date
          </Text>

          <Calendar
            onDayPress={onDayPress}
            markingType="period"
            markedDates={calendarRange.markedDates}
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

          {/* Clear Selection Button */}
          <TouchableOpacity
            style={[styles.clearButton, { opacity: hasSelection ? 1 : 0 }]}
            onPress={onClear}
            disabled={!hasSelection}
          >
            <Ionicons name="trash-outline" size={16} color={colors.text.secondary} />
            <Text style={[styles.clearButtonText, { color: colors.interactive.primary }]}>Clear Selection</Text>
          </TouchableOpacity>
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
});

export default EntryDateRangeModal;

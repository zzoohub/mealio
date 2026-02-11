import React, { memo, useCallback, useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import type { DateData } from "react-native-calendars";
import { useTheme } from "@/shared/ui/theme";
import { tokens } from "@/shared/ui/tokens";
import { formatDateToString } from "@/shared/lib/utils";
import { useMonthThumbnailsQuery } from "../model/useMonthThumbnailsQuery";

// =============================================================================
// TYPES
// =============================================================================

export interface CalendarSheetContentProps {
  selectedDate: Date;
  today: Date;
  markedDates: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }>;
  /** Initial thumbnails from the week query (shown immediately) */
  initialThumbnails: Map<string, string | null>;
  onDayPress: (day: DateData) => void;
  onClose: () => void;
  title: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getMonthRange(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CalendarSheetContent = memo(function CalendarSheetContent({
  selectedDate,
  today,
  markedDates,
  initialThumbnails,
  onDayPress,
  onClose,
  title,
}: CalendarSheetContentProps) {
  const { colors } = useTheme();
  const deviceTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // Own month range state — starts with the selected date's month
  const [monthRange, setMonthRange] = useState(() => getMonthRange(selectedDate));

  // Own thumbnail map — seeded from parent's existing data, then merged with month query results
  const [thumbnails, setThumbnails] = useState<Map<string, string | null>>(() => new Map(initialThumbnails));

  const monthQuery = useMonthThumbnailsQuery(monthRange.startDate, monthRange.endDate, true, deviceTz);

  // Merge month query results into thumbnails when data arrives
  useEffect(() => {
    if (!monthQuery.data) return;
    setThumbnails(prev => {
      const merged = new Map(prev);
      monthQuery.data!.data.forEach(entry => {
        const dateStr = formatDateToString(new Date(entry.eaten_at));
        merged.set(dateStr, entry.primary_photo_url);
      });
      return merged;
    });
  }, [monthQuery.data]);

  const handleMonthChange = useCallback((date: DateData) => {
    const year = date.year;
    const month = String(date.month).padStart(2, "0");
    const lastDay = new Date(date.year, date.month, 0).getDate();
    setMonthRange({
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    });
  }, []);

  const renderCalendarDay = useCallback(
    (dayProps: { date?: DateData; state?: string; marking?: { selected?: boolean; marked?: boolean } }) => {
      if (!dayProps.date) return <View />;
      const { date, state, marking } = dayProps;
      const dateStr = date.dateString;
      const isDisabled = state === "disabled";
      const isSelected = !!marking?.selected;
      const isTodayDate = dateStr === formatDateToString(today);
      const thumbnailUrl = thumbnails.get(dateStr) ?? null;
      const hasThumbnail = !!thumbnailUrl && !isDisabled;

      return (
        <Pressable
          style={[styles.calendarDay, hasThumbnail && styles.calendarDayWithThumbnail]}
          onPress={() => !isDisabled && onDayPress(date)}
          disabled={isDisabled}
        >
          {hasThumbnail && (
            <>
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.calendarDayThumbnail}
                blurRadius={4}
                contentFit="cover"
              />
              <View style={styles.calendarDayOverlay} />
            </>
          )}
          {isSelected && (
            <View
              style={[styles.calendarDaySelectionBorder, { borderColor: colors.interactive.primary }]}
              pointerEvents="none"
            />
          )}
          <Text
            allowFontScaling={false}
            style={[
              styles.calendarDayText,
              { color: hasThumbnail ? "white" : colors.text.primary },
              isTodayDate &&
                !isSelected &&
                !hasThumbnail && { color: colors.interactive.primary, fontWeight: tokens.typography.fontWeight.bold },
              isSelected &&
                !hasThumbnail && { color: colors.interactive.primary, fontWeight: tokens.typography.fontWeight.bold },
              isDisabled && { color: colors.text.secondary, opacity: 0.4 },
            ]}
          >
            {date.day}
          </Text>
        </Pressable>
      );
    },
    [colors, today, thumbnails, onDayPress],
  );

  return (
    <>
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{title}</Text>
        <Pressable onPress={onClose} style={styles.modalCloseButton}>
          <Ionicons name="close" size={22} color={colors.text.secondary} />
        </Pressable>
      </View>

      <View style={styles.calendarContainer}>
        <Calendar
          current={formatDateToString(selectedDate)}
          maxDate={formatDateToString(today)}
          onDayPress={onDayPress}
          onMonthChange={handleMonthChange}
          markedDates={markedDates}
          dayComponent={renderCalendarDay}
          theme={{
            backgroundColor: colors.bg.secondary,
            calendarBackground: colors.bg.secondary,
            textSectionTitleColor: colors.text.secondary,
            arrowColor: colors.interactive.primary,
            disabledArrowColor: colors.text.secondary,
            monthTextColor: colors.text.primary,
            indicatorColor: colors.interactive.primary,
            textMonthFontWeight: "600",
            textDayHeaderFontWeight: "500",
            textMonthFontSize: tokens.typography.fontSize.h4,
            textDayHeaderFontSize: tokens.typography.fontSize.bodySmall,
          }}
        />
      </View>
    </>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.layout.md,
    paddingTop: tokens.spacing.layout.md,
    paddingBottom: tokens.spacing.component.sm,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.bold,
  },
  calendarContainer: {
    paddingHorizontal: tokens.spacing.component.sm,
    paddingBottom: tokens.spacing.layout.xl,
    minHeight: 400,
  },
  calendarDay: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
  },
  calendarDayWithThumbnail: {
    position: "relative",
  },
  calendarDaySelectionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    zIndex: 2,
  },
  calendarDayThumbnail: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: tokens.radius.sm,
  },
  calendarDayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: tokens.radius.sm,
  },
  calendarDayText: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    zIndex: 1,
  },
});

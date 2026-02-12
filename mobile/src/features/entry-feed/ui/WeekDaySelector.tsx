import React, { useCallback, useRef, useEffect, useMemo, useState, memo } from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import PagerView from "react-native-pager-view";
import { useTheme } from "@/shared/ui/theme";
import { tokens } from "@/shared/ui/tokens";
import { getDayName, getWeekDays, formatDateToString } from "@/shared/lib/utils";
import { getCurrentLanguage } from "@/shared/lib/i18n";

// =============================================================================
// TYPES
// =============================================================================

export interface WeekDaySelectorProps {
  selectedDate: Date;
  today: Date;
  onDateSelect: (date: Date) => void;
  onVisibleWeekChange?: (weekDays: Date[]) => void;
  dateThumbnails: Map<string, string | null>;
}

interface WeekData {
  id: string;
  days: Date[];
  index: number;
}

interface DayItemProps {
  date: Date;
  dayIndex: number;
  isSelected: boolean;
  isToday: boolean;
  isFuture: boolean;
  thumbnailUrl: string | null;
  onPress: (date: Date) => void;
  dayWidth: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const WEEKS_BEFORE = 104; // 2 years back
const WEEKS_AFTER = 0; // No future dates
const INITIAL_INDEX = WEEKS_BEFORE; // Start at "today" week
const RENDER_BUFFER = 2; // Pages to render on each side of current

// =============================================================================
// HELPERS
// =============================================================================

function generateAllWeeks(today: Date): WeekData[] {
  const weeks: WeekData[] = [];
  const todayWeekStart = getWeekDays(today)[0];

  if (!todayWeekStart) return weeks;

  for (let i = -WEEKS_BEFORE; i <= WEEKS_AFTER; i++) {
    const offsetDate = new Date(todayWeekStart);
    offsetDate.setDate(offsetDate.getDate() + i * 7);
    const days = getWeekDays(offsetDate);
    const weekId = days[0] ? formatDateToString(days[0]) : `week-${i}`;

    weeks.push({
      id: weekId,
      days,
      index: i + WEEKS_BEFORE,
    });
  }

  return weeks;
}

function findWeekIndex(weeks: WeekData[], targetDate: Date): number {
  const targetWeekStart = getWeekDays(targetDate)[0];
  if (!targetWeekStart) return INITIAL_INDEX;

  const targetId = formatDateToString(targetWeekStart);
  const index = weeks.findIndex(w => w.id === targetId);

  return index !== -1 ? index : INITIAL_INDEX;
}

// =============================================================================
// DAY ITEM COMPONENT (Memoized)
// =============================================================================

const DayItem = memo(function DayItem({
  date,
  dayIndex,
  isSelected,
  isToday,
  isFuture,
  thumbnailUrl,
  onPress,
  dayWidth,
}: DayItemProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    if (!isFuture) {
      onPress(date);
    }
  }, [date, isFuture, onPress]);

  const hasThumbnail = !!thumbnailUrl && !isFuture;

  return (
    <Pressable
      style={[
        styles.dayItem,
        { width: dayWidth },
        hasThumbnail && styles.dayItemWithThumbnail,
        isSelected
          ? { borderColor: colors.interactive.primary }
          : { borderColor: "transparent" },
      ]}
      onPress={handlePress}
      disabled={isFuture}
    >
      {hasThumbnail && (
        <>
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnailImage}
            blurRadius={6}
            contentFit="cover"
          />
          <View style={styles.thumbnailOverlay} />
        </>
      )}
      <Text
        allowFontScaling={false}
        style={[
          styles.dayName,
          { color: hasThumbnail ? "white" : colors.text.secondary },
          isSelected && !hasThumbnail && { color: colors.interactive.primary },
          isFuture && styles.futureText,
        ]}
      >
        {getDayName(dayIndex, getCurrentLanguage())}
      </Text>
      <Text
        allowFontScaling={false}
        style={[
          styles.dayNumber,
          { color: hasThumbnail ? "white" : colors.text.primary },
          isToday && !isSelected && !hasThumbnail && { color: colors.interactive.primary },
          isSelected && !hasThumbnail && { color: colors.interactive.primary },
          isFuture && styles.futureText,
        ]}
      >
        {date.getDate()}
      </Text>
    </Pressable>
  );
});

// =============================================================================
// WEEK ROW COMPONENT (Memoized)
// =============================================================================

interface WeekRowProps {
  days: Date[];
  selectedDateStr: string;
  todayStr: string;
  todayTime: number;
  onDateSelect: (date: Date) => void;
  dateThumbnails: Map<string, string | null>;
  screenWidth: number;
}

const WeekRow = memo(function WeekRow({
  days,
  selectedDateStr,
  todayStr,
  todayTime,
  onDateSelect,
  dateThumbnails,
  screenWidth,
}: WeekRowProps) {
  const dayWidth = (screenWidth - GAP * 6) / 7;

  return (
    <View style={[styles.weekContainer, { width: screenWidth }]}>
      {days.map((date, index) => {
        const dateStr = formatDateToString(date);
        const isSelected = dateStr === selectedDateStr;
        const isToday = dateStr === todayStr;
        const isFuture = date.getTime() > todayTime && !isToday;
        const thumbnailUrl = dateThumbnails.get(dateStr) ?? null;

        return (
          <DayItem
            key={dateStr}
            date={date}
            dayIndex={index}
            isSelected={isSelected}
            isToday={isToday}
            isFuture={isFuture}
            thumbnailUrl={thumbnailUrl}
            onPress={onDateSelect}
            dayWidth={dayWidth}
          />
        );
      })}
    </View>
  );
});

// =============================================================================
// COMPONENT
// =============================================================================

export const WeekDaySelector = memo(function WeekDaySelector({
  selectedDate,
  today,
  onDateSelect,
  onVisibleWeekChange,
  dateThumbnails,
}: WeekDaySelectorProps) {
  const { width: screenWidth } = useWindowDimensions();
  const pagerRef = useRef<PagerView>(null);
  const currentIndexRef = useRef(INITIAL_INDEX);
  const lastNotifiedIdRef = useRef<string | null>(null);

  // Lazy rendering: only mount WeekRow for pages near the current page
  const [activeRange, setActiveRange] = useState(() => ({
    start: Math.max(0, INITIAL_INDEX - RENDER_BUFFER),
    end: Math.min(INITIAL_INDEX + RENDER_BUFFER, WEEKS_BEFORE + WEEKS_AFTER),
  }));

  const expandRange = useCallback((centerIndex: number) => {
    setActiveRange((prev) => {
      const newStart = Math.min(prev.start, Math.max(0, centerIndex - RENDER_BUFFER));
      const newEnd = Math.max(prev.end, Math.min(centerIndex + RENDER_BUFFER, WEEKS_BEFORE + WEEKS_AFTER));
      if (newStart === prev.start && newEnd === prev.end) return prev;
      return { start: newStart, end: newEnd };
    });
  }, []);

  const selectedDateStr = useMemo(
    () => formatDateToString(selectedDate),
    [selectedDate]
  );
  const todayStr = useMemo(() => formatDateToString(today), [today]);
  const todayTime = useMemo(() => today.getTime(), [today]);

  const weeks = useMemo(() => generateAllWeeks(today), [today]);

  // Navigate to selected date when it changes externally (e.g., calendar modal)
  useEffect(() => {
    const targetIndex = findWeekIndex(weeks, selectedDate);
    if (targetIndex !== currentIndexRef.current) {
      expandRange(targetIndex);
      pagerRef.current?.setPage(targetIndex);
      currentIndexRef.current = targetIndex;
    }
  }, [selectedDate, weeks, expandRange]);

  const handlePageSelected = useCallback(
    (event: { nativeEvent: { position: number } }) => {
      const index = event.nativeEvent.position;
      currentIndexRef.current = index;
      expandRange(index);

      const week = weeks[index];
      if (week && week.id !== lastNotifiedIdRef.current) {
        lastNotifiedIdRef.current = week.id;
        onVisibleWeekChange?.(week.days);
      }
    },
    [weeks, onVisibleWeekChange, expandRange]
  );

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        initialPage={INITIAL_INDEX}
        onPageSelected={handlePageSelected}
        style={styles.pager}
      >
        {weeks.map((week, index) => (
          <View key={week.id}>
            {index >= activeRange.start && index <= activeRange.end ? (
              <WeekRow
                days={week.days}
                selectedDateStr={selectedDateStr}
                todayStr={todayStr}
                todayTime={todayTime}
                onDateSelect={onDateSelect}
                dateThumbnails={dateThumbnails}
                screenWidth={screenWidth}
              />
            ) : null}
          </View>
        ))}
      </PagerView>
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const GAP = 2;

const styles = StyleSheet.create({
  container: {
    height: 72,
    overflow: "hidden",
  },
  pager: {
    flex: 1,
  },
  weekContainer: {
    flexDirection: "row",
    gap: GAP,
    paddingVertical: 4,
  },
  dayItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: tokens.spacing.component.md,
    borderRadius: tokens.radius.sm,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  dayItemWithThumbnail: {
    position: "relative",
  },
  thumbnailImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: tokens.radius.sm,
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: tokens.radius.sm,
  },
  dayName: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
    marginBottom: tokens.spacing.component.xs,
    zIndex: 1,
  },
  dayNumber: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    zIndex: 1,
  },
  futureText: {
    opacity: 0.3,
  },
});

export default WeekDaySelector;

import React, { useCallback, useRef, useEffect, useMemo, useState, memo } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import PagerView from "react-native-pager-view";
import { useTheme } from "@/shared/ui/theme";
import { tokens } from "@/shared/ui/tokens";
import { getDayName, getWeekDays, formatDateToString } from "@/shared/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface WeekDaySelectorProps {
  selectedDate: Date;
  today: Date;
  onDateSelect: (date: Date) => void;
  onVisibleWeekChange?: (weekDays: Date[]) => void;
  datesWithEntries: Set<string>;
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
  hasEntries: boolean;
  onPress: (date: Date) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get("window");
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
  hasEntries,
  onPress,
}: DayItemProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    if (!isFuture) {
      onPress(date);
    }
  }, [date, isFuture, onPress]);

  return (
    <Pressable
      style={[
        styles.dayItem,
        isSelected && { backgroundColor: colors.interactive.primary },
      ]}
      onPress={handlePress}
      disabled={isFuture}
    >
      <Text
        style={[
          styles.dayName,
          { color: isSelected ? "white" : colors.text.secondary },
          isFuture && styles.futureText,
        ]}
      >
        {getDayName(dayIndex, "ko")}
      </Text>
      <Text
        style={[
          styles.dayNumber,
          { color: isSelected ? "white" : colors.text.primary },
          isToday && !isSelected && { color: colors.interactive.primary },
          isFuture && styles.futureText,
        ]}
      >
        {date.getDate()}
      </Text>
      <View
        style={[
          styles.entryMarker,
          {
            backgroundColor: isSelected ? "white" : colors.interactive.primary,
            opacity: hasEntries && !isFuture ? 1 : 0,
          },
        ]}
      />
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
  datesWithEntries: Set<string>;
}

const WeekRow = memo(function WeekRow({
  days,
  selectedDateStr,
  todayStr,
  todayTime,
  onDateSelect,
  datesWithEntries,
}: WeekRowProps) {
  return (
    <View style={styles.weekContainer}>
      {days.map((date, index) => {
        const dateStr = formatDateToString(date);
        const isSelected = dateStr === selectedDateStr;
        const isToday = dateStr === todayStr;
        const isFuture = date.getTime() > todayTime && !isToday;
        const hasEntries = datesWithEntries.has(dateStr);

        return (
          <DayItem
            key={dateStr}
            date={date}
            dayIndex={index}
            isSelected={isSelected}
            isToday={isToday}
            isFuture={isFuture}
            hasEntries={hasEntries}
            onPress={onDateSelect}
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
  datesWithEntries,
}: WeekDaySelectorProps) {
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
                datesWithEntries={datesWithEntries}
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

const styles = StyleSheet.create({
  container: {
    height: 80,
    overflow: "hidden",
  },
  pager: {
    flex: 1,
  },
  weekContainer: {
    width: SCREEN_WIDTH,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: tokens.spacing.component.sm,
  },
  dayItem: {
    alignItems: "center",
    paddingVertical: tokens.spacing.component.sm,
    paddingHorizontal: tokens.spacing.component.sm,
    borderRadius: tokens.radius.md,
    minWidth: 40,
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
  futureText: {
    opacity: 0.3,
  },
});

export default WeekDaySelector;

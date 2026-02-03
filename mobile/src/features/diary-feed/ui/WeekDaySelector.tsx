import React, { useCallback, useRef, useEffect, useMemo, memo } from "react";
import { View, Text, StyleSheet, Dimensions, FlatList } from "react-native";
import { Pressable } from "react-native-gesture-handler";
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
  const flatListRef = useRef<FlatList<WeekData>>(null);
  const currentIndexRef = useRef(INITIAL_INDEX);
  const lastNotifiedIdRef = useRef<string | null>(null);

  // Pre-compute string versions for stable comparisons
  const selectedDateStr = useMemo(
    () => formatDateToString(selectedDate),
    [selectedDate]
  );
  const todayStr = useMemo(() => formatDateToString(today), [today]);
  const todayTime = useMemo(() => today.getTime(), [today]);

  // Pre-generate all weeks once
  const weeks = useMemo(() => generateAllWeeks(today), [today]);

  // Scroll to selected date when it changes (e.g., from calendar modal)
  useEffect(() => {
    const targetIndex = findWeekIndex(weeks, selectedDate);
    if (targetIndex !== currentIndexRef.current) {
      flatListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: true,
      });
      currentIndexRef.current = targetIndex;
    }
  }, [selectedDate, weeks]);

  // Handle scroll end to notify parent of visible week
  const handleMomentumScrollEnd = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);

      if (index >= 0 && index < weeks.length) {
        currentIndexRef.current = index;
        const week = weeks[index];

        if (week && week.id !== lastNotifiedIdRef.current) {
          lastNotifiedIdRef.current = week.id;
          onVisibleWeekChange?.(week.days);
        }
      }
    },
    [weeks, onVisibleWeekChange]
  );

  // Stable render function
  const renderWeek = useCallback(
    ({ item }: { item: WeekData }) => (
      <WeekRow
        days={item.days}
        selectedDateStr={selectedDateStr}
        todayStr={todayStr}
        todayTime={todayTime}
        onDateSelect={onDateSelect}
        datesWithEntries={datesWithEntries}
      />
    ),
    [selectedDateStr, todayStr, todayTime, onDateSelect, datesWithEntries]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: WeekData) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={weeks}
        renderItem={renderWeek}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={INITIAL_INDEX}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        decelerationRate="fast"
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={3}
      />
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

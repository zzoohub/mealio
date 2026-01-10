import React, { useCallback, useRef, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList } from "react-native";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { isSameDay, getDayName, getWeekDays } from "../utils/dateUtils";

// =============================================================================
// TYPES
// =============================================================================

export interface WeekDaySelectorProps {
  selectedDate: Date;
  today: Date;
  onDateSelect: (date: Date) => void;
  onVisibleWeekChange?: (weekDays: Date[]) => void;
  dateHasEntries: (date: Date) => boolean;
}

interface WeekData {
  id: string;
  days: Date[];
  index: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const WEEKS_BEFORE = 104; // 2 years back
const WEEKS_AFTER = 52; // 1 year forward
const TOTAL_WEEKS = WEEKS_BEFORE + 1 + WEEKS_AFTER; // 157 weeks
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
    const weekId = days[0]?.toISOString().split("T")[0] || `week-${i}`;

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

  const targetId = targetWeekStart.toISOString().split("T")[0];
  const index = weeks.findIndex(w => w.id === targetId);

  return index !== -1 ? index : INITIAL_INDEX;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function WeekDaySelector({
  selectedDate,
  today,
  onDateSelect,
  onVisibleWeekChange,
  dateHasEntries,
}: WeekDaySelectorProps) {
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList<WeekData>>(null);
  const currentIndexRef = useRef(INITIAL_INDEX);
  const lastNotifiedIdRef = useRef<string | null>(null);

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
    [weeks, onVisibleWeekChange],
  );

  // Render a single week
  const renderWeek = useCallback(
    ({ item }: { item: WeekData }) => (
      <View style={styles.weekContainer}>
        {item.days.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const hasEntries = dateHasEntries(date);

          return (
            <TouchableOpacity
              key={`${date.getTime()}-${index}`}
              style={[styles.dayItem, isSelected && { backgroundColor: colors.interactive.primary }]}
              onPress={() => onDateSelect(date)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayName, { color: isSelected ? "white" : colors.text.secondary }]}>
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
    ),
    [selectedDate, today, colors, onDateSelect, dateHasEntries],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
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
}

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
});

export default WeekDaySelector;

import React from 'react';
import {
  View,
  StyleSheet,
  AccessibilityProps,
} from 'react-native';
import { useTheme } from '@/lib/theme';
import { SPACING } from '@/constants';
import { DayCell, DayData } from './DayCell';
import type { BaseComponentProps } from '@/types';

/**
 * Week data structure for WeekCalendar
 */
export interface WeekData {
  /** Array of 7 days representing the week */
  days: DayData[];
  /** Set of day numbers (1-31) that have meal entries */
  daysWithMeals: Set<number>;
}

export interface WeekCalendarProps extends BaseComponentProps {
  /** Week data to display */
  week: WeekData;
  /** Currently selected day of month */
  selectedDay: number | null;
  /** Today's day of month (for highlighting) */
  todayDayOfMonth?: number;
  /** Callback when a day is pressed - parent handles selection logic */
  onDayPress?: (day: DayData) => void;
  /** Days that should be disabled (e.g., future dates) */
  disabledDays?: Set<number>;
}

/**
 * WeekCalendar - Horizontal week calendar component
 *
 * Displays a single week with 7 day cells arranged horizontally.
 * Uses DayCell components for individual days.
 *
 * Features:
 * - Highlights today
 * - Shows selected day
 * - Indicates days with meal entries
 * - Supports disabled days
 *
 * @example
 * ```tsx
 * <WeekCalendar
 *   week={{
 *     days: generateWeekDays(currentDate),
 *     daysWithMeals: new Set([10, 11, 12])
 *   }}
 *   selectedDay={11}
 *   todayDayOfMonth={11}
 *   onDayPress={(day) => setSelectedDay(day.dayOfMonth)}
 * />
 * ```
 */
export function WeekCalendar({
  week,
  selectedDay,
  todayDayOfMonth,
  onDayPress,
  disabledDays = new Set(),
  testID,
  style,
}: WeekCalendarProps) {
  const { theme } = useTheme();

  const accessibilityProps: AccessibilityProps = {
    accessible: true,
    accessibilityRole: 'list',
    accessibilityLabel: 'Week calendar',
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface },
        style,
      ]}
      testID={testID}
      {...accessibilityProps}
    >
      <View style={styles.weekRow}>
        {week.days.map((day, index) => (
          <DayCell
            key={`day-${day.dayOfMonth}-${index}`}
            day={day}
            isSelected={selectedDay === day.dayOfMonth}
            isToday={todayDayOfMonth === day.dayOfMonth}
            hasMeals={week.daysWithMeals.has(day.dayOfMonth)}
            disabled={disabledDays.has(day.dayOfMonth)}
            onPress={() => onDayPress?.(day)}
            testID={`${testID}-day-${day.dayOfMonth}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
});

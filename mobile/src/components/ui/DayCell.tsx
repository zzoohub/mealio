import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  AccessibilityProps,
} from 'react-native';
import { useTheme } from '@/lib/theme';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, UI_CONSTANTS } from '@/constants';
import type { BaseComponentProps } from '@/types';

/**
 * Day display data for the DayCell component
 */
export interface DayData {
  /** Day of week abbreviation (e.g., "Mon", "Tue") */
  dayOfWeek: string;
  /** Day of month number (1-31) */
  dayOfMonth: number;
  /** Full date for accessibility */
  fullDate: Date;
}

export interface DayCellProps extends BaseComponentProps {
  /** Day data to display */
  day: DayData;
  /** Whether this day is currently selected */
  isSelected?: boolean;
  /** Whether this day is today */
  isToday?: boolean;
  /** Whether this day has meal entries */
  hasMeals?: boolean;
  /** Whether the cell is disabled (e.g., future dates) */
  disabled?: boolean;
  /** Press handler - injected by parent */
  onPress?: () => void;
}

/**
 * DayCell - Individual day cell for week calendar
 *
 * Pure UI component displaying a single day with visual states:
 * - Selected state (highlighted background)
 * - Today indicator (ring/outline)
 * - Has meals indicator (dot)
 * - Disabled state (reduced opacity)
 *
 * @example
 * ```tsx
 * <DayCell
 *   day={{ dayOfWeek: 'Mon', dayOfMonth: 15, fullDate: new Date() }}
 *   isSelected={selectedDay === 15}
 *   isToday={true}
 *   hasMeals={true}
 *   onPress={() => handleDaySelect(15)}
 * />
 * ```
 */
export function DayCell({
  day,
  isSelected = false,
  isToday = false,
  hasMeals = false,
  disabled = false,
  onPress,
  testID,
  style,
}: DayCellProps) {
  const { theme } = useTheme();

  // Accessibility label for screen readers
  const accessibilityLabel = [
    `${day.dayOfWeek}, ${day.fullDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
    isToday ? 'Today' : '',
    isSelected ? 'Selected' : '',
    hasMeals ? 'Has meal entries' : 'No meals logged',
    disabled ? 'Not available' : '',
  ]
    .filter(Boolean)
    .join(', ');

  const accessibilityProps: AccessibilityProps = {
    accessible: true,
    accessibilityLabel,
    accessibilityRole: 'button',
    accessibilityState: {
      selected: isSelected,
      disabled,
    },
  };

  const containerStyle: ViewStyle[] = [
    styles.container,
    isSelected && { backgroundColor: theme.colors.primary },
    isToday && !isSelected && {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    disabled && styles.disabled,
    style,
  ];

  const dayOfWeekColor = isSelected
    ? 'white'
    : disabled
    ? theme.colors.textSecondary
    : theme.colors.textSecondary;

  const dayOfMonthColor = isSelected
    ? 'white'
    : disabled
    ? theme.colors.textSecondary
    : theme.colors.text;

  return (
    <Pressable
      style={({ pressed }) => [
        ...containerStyle,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      {...accessibilityProps}
    >
      <Text
        style={[
          styles.dayOfWeek,
          { color: dayOfWeekColor },
        ]}
        numberOfLines={1}
      >
        {day.dayOfWeek}
      </Text>
      <Text
        style={[
          styles.dayOfMonth,
          { color: dayOfMonthColor },
        ]}
        numberOfLines={1}
      >
        {day.dayOfMonth}
      </Text>
      {hasMeals && (
        <View
          style={[
            styles.mealIndicator,
            {
              backgroundColor: isSelected
                ? 'white'
                : theme.colors.primary,
            },
          ]}
          accessible={false}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: UI_CONSTANTS.MIN_TOUCH_TARGET,
    minHeight: UI_CONSTANTS.MIN_TOUCH_TARGET + 20, // Extra height for content
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  dayOfWeek: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  dayOfMonth: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  mealIndicator: {
    width: 6,
    height: 6,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
  },
});

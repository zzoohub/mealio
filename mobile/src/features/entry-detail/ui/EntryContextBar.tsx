/**
 * EntryContextBar - Context bar showing meal type, time, and location
 *
 * Displays contextual information about the entry in a horizontal bar.
 * Meal type is tappable for inline editing.
 * Location is optional and hidden when not available.
 *
 * @example
 * ```tsx
 * <EntryContextBar
 *   mealType="lunch"
 *   timestamp={new Date()}
 *   location={{ label: "Cafe Mealio" }}
 *   onMealTypePress={() => showMealTypePicker()}
 * />
 * ```
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActionSheetIOS, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles } from '@/shared/ui/theme';
import { MealType } from '@/entities/meal';
import type { Location } from '@/entities/entry';

// =============================================================================
// TYPES
// =============================================================================

export interface EntryContextBarProps {
  /** Type of meal */
  mealType: MealType | string;
  /** Timestamp of the entry */
  timestamp: Date;
  /** Location information (optional) */
  location?: Location | null | undefined;
  /** Callback when meal type changes */
  onMealTypeChange?: ((mealType: MealType) => void) | undefined;
  /** Whether editing is disabled */
  disabled?: boolean | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTEXT_BAR_HEIGHT = 36;

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get the Ionicons icon name for a meal type
 */
function getMealTypeIcon(mealType: string): string {
  switch (mealType.toLowerCase()) {
    case 'breakfast':
      return 'sunny-outline';
    case 'lunch':
      return 'sunny';
    case 'dinner':
      return 'moon-outline';
    case 'snack':
      return 'nutrition-outline';
    default:
      return 'restaurant-outline';
  }
}

/**
 * Get display label for meal type
 */
function getMealTypeLabel(mealType: string): string {
  switch (mealType.toLowerCase()) {
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    case 'dinner':
      return 'Dinner';
    case 'snack':
      return 'Snack';
    default:
      return 'Meal';
  }
}

/**
 * Format timestamp to 12-hour format with AM/PM
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get location display label
 */
function getLocationLabel(location?: Location | null): string | null {
  if (!location) return null;
  return location.restaurantName || location.address?.split(',')[0] || null;
}

// =============================================================================
// CONSTANTS - MEAL TYPE OPTIONS
// =============================================================================

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: MealType.BREAKFAST, label: '아침' },
  { value: MealType.LUNCH, label: '점심' },
  { value: MealType.DINNER, label: '저녁' },
  { value: MealType.SNACK, label: '간식' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryContextBar({
  mealType,
  timestamp,
  location,
  onMealTypeChange,
  disabled = false,
  testID,
}: EntryContextBarProps) {
  const s = useStyles(styles);
  const locationLabel = getLocationLabel(location);

  const handleMealTypePress = () => {
    if (disabled || !onMealTypeChange) return;

    const options = MEAL_TYPE_OPTIONS.map((opt) => opt.label);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, '취소'],
          cancelButtonIndex: options.length,
          title: '식사 종류 선택',
        },
        (buttonIndex) => {
          const selectedOption = MEAL_TYPE_OPTIONS[buttonIndex];
          if (buttonIndex < options.length && selectedOption) {
            onMealTypeChange?.(selectedOption.value);
          }
        }
      );
    } else {
      // Android: Use Alert with buttons
      Alert.alert(
        '식사 종류 선택',
        undefined,
        [
          ...MEAL_TYPE_OPTIONS.map((opt) => ({
            text: opt.label,
            onPress: () => onMealTypeChange(opt.value),
          })),
          { text: '취소', style: 'cancel' as const },
        ]
      );
    }
  };

  return (
    <View
      style={s.container}
      testID={testID}
      accessibilityLabel={`${getMealTypeLabel(mealType)} at ${formatTime(timestamp)}${locationLabel ? `, at ${locationLabel}` : ''}`}
    >
      {/* Meal Type - Tappable */}
      <TouchableOpacity
        style={s.mealTypeButton}
        onPress={handleMealTypePress}
        disabled={disabled || !onMealTypeChange}
        activeOpacity={0.7}
        accessibilityLabel={`식사 종류: ${getMealTypeLabel(mealType)}, 탭하여 변경`}
        accessibilityRole="button"
      >
        <Ionicons
          name={getMealTypeIcon(mealType) as any}
          size={14}
          color={s.iconColor.color as string}
        />
        <Text style={s.label}>{getMealTypeLabel(mealType)}</Text>
        {onMealTypeChange && (
          <Ionicons
            name="chevron-down"
            size={12}
            color={s.iconColor.color as string}
          />
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View style={s.divider} />

      {/* Time */}
      <View style={s.item}>
        <Text style={s.label}>{formatTime(timestamp)}</Text>
      </View>

      {/* Location (if available) */}
      {locationLabel && (
        <>
          <View style={s.divider} />
          <View style={[s.item, s.locationItem]}>
            <Ionicons
              name="location-outline"
              size={14}
              color={s.iconColor.color as string}
            />
            <Text style={s.label} numberOfLines={1}>
              {locationLabel}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

export default EntryContextBar;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CONTEXT_BAR_HEIGHT,
    paddingHorizontal: tokens.spacing.component.md,
    borderBottomWidth: tokens.borderWidth.default,
    borderBottomColor: colors.border.default,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 4,
  },
  locationItem: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-end',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: colors.border.divider,
    marginHorizontal: tokens.spacing.component.sm,
  },
  label: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.normal,
    color: colors.text.tertiary,
  },
  iconColor: {
    color: colors.text.tertiary,
  },
}));

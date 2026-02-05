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

import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ActionSheetIOS, Platform, Alert } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles } from '@/shared/ui/theme';
import { BottomSheet } from '@/shared/ui/styled';
import { MealType } from '@/entities/meal';
import type { Location } from '@/entities/entry';
import { useCommonI18n, useDiaryI18n, getCurrentLanguage } from '@/shared/lib/i18n';

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
  /** Callback when timestamp changes */
  onTimestampChange?: ((timestamp: Date) => void) | undefined;
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
 * Format timestamp to 12-hour format with AM/PM
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString(getCurrentLanguage(), {
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
  return location.address?.split(',')[0] || null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryContextBar({
  mealType,
  timestamp,
  location,
  onMealTypeChange,
  onTimestampChange,
  disabled = false,
  testID,
}: EntryContextBarProps) {
  const s = useStyles(styles);
  const locationLabel = getLocationLabel(location);
  const common = useCommonI18n();
  const diary = useDiaryI18n();

  // DateTimePicker state
  const [showTimePicker, setShowTimePicker] = useState(false);

  const getMealTypeLabel = (mt: string): string => {
    switch (mt.toLowerCase()) {
      case 'breakfast': return common.mealTypeBreakfast;
      case 'lunch': return common.mealTypeLunch;
      case 'dinner': return common.mealTypeDinner;
      case 'snack': return common.mealTypeSnack;
      default: return common.mealTypeMeal;
    }
  };

  const MEAL_TYPE_OPTIONS = useMemo(() => [
    { value: MealType.BREAKFAST, label: common.mealTypeBreakfast },
    { value: MealType.LUNCH, label: common.mealTypeLunch },
    { value: MealType.DINNER, label: common.mealTypeDinner },
    { value: MealType.SNACK, label: common.mealTypeSnack },
  ], [common.mealTypeBreakfast, common.mealTypeLunch, common.mealTypeDinner, common.mealTypeSnack]);

  const handleMealTypePress = () => {
    if (disabled || !onMealTypeChange) return;

    const options = MEAL_TYPE_OPTIONS.map((opt) => opt.label);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, common.cancel],
          cancelButtonIndex: options.length,
          title: diary.mealTypeSelect,
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
        diary.mealTypeSelect,
        undefined,
        [
          ...MEAL_TYPE_OPTIONS.map((opt) => ({
            text: opt.label,
            onPress: () => onMealTypeChange(opt.value),
          })),
          { text: common.cancel, style: 'cancel' as const },
        ]
      );
    }
  };

  const handleTimestampPress = () => {
    if (disabled || !onTimestampChange) return;
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android: dialog dismisses automatically
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed') return;

    if (selectedDate) {
      // Merge selected time with the entry's existing date
      const merged = new Date(timestamp);
      merged.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);

      const now = new Date();
      if (merged <= now) {
        onTimestampChange?.(merged);
      }
    }
  };

  const handleDismissIOSPicker = () => {
    setShowTimePicker(false);
  };

  return (
    <View testID={testID}>
      <View
        style={s.container}
        accessibilityLabel={`${getMealTypeLabel(mealType)} at ${formatTime(timestamp)}${locationLabel ? `, at ${locationLabel}` : ''}`}
      >
        {/* Meal Type - Tappable */}
        <Pressable
          style={s.mealTypeButton}
          onPress={handleMealTypePress}
          disabled={disabled || !onMealTypeChange}
          accessibilityLabel={diary.mealTypeAccessibility(getMealTypeLabel(mealType))}
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
        </Pressable>

        {/* Divider */}
        <View style={s.divider} />

        {/* Time - Tappable when onTimestampChange provided */}
        {onTimestampChange ? (
          <Pressable
            style={s.mealTypeButton}
            onPress={handleTimestampPress}
            disabled={disabled}
            accessibilityLabel={diary.changeDateTime}
            accessibilityRole="button"
          >
            <Text style={s.label}>{formatTime(timestamp)}</Text>
            <Ionicons
              name="chevron-down"
              size={12}
              color={s.iconColor.color as string}
            />
          </Pressable>
        ) : (
          <View style={s.item}>
            <Text style={s.label}>{formatTime(timestamp)}</Text>
          </View>
        )}

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

      {/* iOS: Native time picker in BottomSheet */}
      {onTimestampChange && Platform.OS === 'ios' && (
        <BottomSheet
          visible={showTimePicker}
          onClose={handleDismissIOSPicker}
          style={s.pickerSheet}
        >
          <View style={s.pickerDoneRow}>
            <Pressable onPress={handleDismissIOSPicker} hitSlop={8}>
              <Text style={s.pickerDoneText}>{common.done}</Text>
            </Pressable>
          </View>
          <View style={s.pickerBody}>
            <DateTimePicker
              value={timestamp}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
              maximumDate={new Date()}
            />
          </View>
        </BottomSheet>
      )}

      {/* Android: Native time dialog */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={timestamp}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
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
  pickerSheet: {
    backgroundColor: '#ffffff',
  },
  pickerDoneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.sm,
  },
  pickerDoneText: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: colors.interactive.primary,
  },
  pickerBody: {
    alignItems: 'center',
    paddingBottom: tokens.spacing.component.md,
  },
}));

/**
 * EntryFeedbackRow - Rating stars and "Would eat again" toggle
 *
 * Inline editable row for user feedback on the meal.
 * Rating: 1-5 stars (tappable)
 * WouldEatAgain: Toggle switch
 *
 * @example
 * ```tsx
 * <EntryFeedbackRow
 *   rating={4}
 *   wouldEatAgain={true}
 *   onRatingChange={(rating) => updateEntry({ rating })}
 *   onWouldEatAgainChange={(value) => updateEntry({ wouldEatAgain: value })}
 * />
 * ```
 */

import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/design-system/tokens';
import { createStyles, useStyles, useTheme } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface EntryFeedbackRowProps {
  /** Current rating (1-5) */
  rating?: number | null | undefined;
  /** Whether user would eat again */
  wouldEatAgain?: boolean | null | undefined;
  /** Callback when rating changes */
  onRatingChange?: ((rating: number) => void) | undefined;
  /** Callback when wouldEatAgain changes */
  onWouldEatAgainChange?: ((value: boolean) => void) | undefined;
  /** Whether editing is disabled */
  disabled?: boolean | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STAR_COUNT = 5;
const STAR_SIZE = 24;

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryFeedbackRow({
  rating,
  wouldEatAgain,
  onRatingChange,
  onWouldEatAgainChange,
  disabled = false,
  testID,
}: EntryFeedbackRowProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();

  const handleStarPress = (starIndex: number) => {
    if (disabled || !onRatingChange) return;
    // If tapping the same star, clear rating (toggle off)
    const newRating = rating === starIndex ? 0 : starIndex;
    onRatingChange(newRating);
  };

  return (
    <View style={s.container} testID={testID}>
      {/* Rating Stars */}
      <View style={s.ratingContainer}>
        {Array.from({ length: STAR_COUNT }, (_, index) => {
          const starValue = index + 1;
          const isFilled = rating ? starValue <= rating : false;

          return (
            <TouchableOpacity
              key={starValue}
              onPress={() => handleStarPress(starValue)}
              disabled={disabled}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityLabel={`${starValue}점`}
              accessibilityRole="button"
            >
              <Ionicons
                name={isFilled ? 'star' : 'star-outline'}
                size={STAR_SIZE}
                color={isFilled ? colors.status.warning : colors.text.tertiary}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Would Eat Again Toggle */}
      <TouchableOpacity
        style={s.toggleContainer}
        onPress={() => !disabled && onWouldEatAgainChange?.(!wouldEatAgain)}
        disabled={disabled}
        accessibilityLabel="또 먹을래요"
        accessibilityRole="switch"
        accessibilityState={{ checked: !!wouldEatAgain }}
      >
        <Text style={s.toggleLabel}>또 먹을래요</Text>
        <Switch
          value={!!wouldEatAgain}
          onValueChange={onWouldEatAgainChange}
          disabled={disabled}
          trackColor={{
            false: colors.bg.tertiary,
            true: colors.interactive.primary,
          }}
          thumbColor={colors.bg.primary}
          ios_backgroundColor={colors.bg.tertiary}
        />
      </TouchableOpacity>
    </View>
  );
}

export default EntryFeedbackRow;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.md,
    borderBottomWidth: tokens.borderWidth.default,
    borderBottomColor: colors.border.default,
    minHeight: tokens.size.touchTarget.lg,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.component.xs,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border.divider,
    marginHorizontal: tokens.spacing.component.lg,
  },
  toggleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    color: colors.text.primary,
  },
}));

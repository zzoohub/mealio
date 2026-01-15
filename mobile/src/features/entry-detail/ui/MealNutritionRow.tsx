/**
 * MealNutritionRow - Collapsed AI nutrition row for meal detail page
 *
 * Displays a tappable row that shows AI-generated nutrition information.
 * Currently collapsed (v1), will expand to show full details in v2.
 *
 * @example
 * ```tsx
 * <MealNutritionRow
 *   onPress={() => navigation.navigate('NutritionDetail', { mealId })}
 * />
 * ```
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles } from '@/shared/ui/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface MealNutritionRowProps {
  /** Callback when row is pressed */
  onPress?: (() => void) | undefined;
  /** Whether nutrition data is available */
  hasNutritionData?: boolean | undefined;
  /** Whether the row should be disabled */
  disabled?: boolean | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MealNutritionRow({
  onPress,
  hasNutritionData = true,
  disabled = false,
  testID,
}: MealNutritionRowProps) {
  const s = useStyles(styles);

  return (
    <TouchableOpacity
      style={[s.container, disabled && s.containerDisabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      accessibilityLabel="View AI-generated nutrition information"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
    >
      {/* Left Content */}
      <View style={s.leftContent}>
        <Text style={[s.title, disabled && s.titleDisabled]}>Nutrition</Text>
      </View>

      {/* Right Content */}
      <View style={s.rightContent}>
        {/* AI Badge */}
        <View style={[s.badge, disabled && s.badgeDisabled]}>
          <Text style={[s.badgeText, disabled && s.badgeTextDisabled]}>AI</Text>
        </View>

        {/* Chevron */}
        <Ionicons
          name="chevron-forward"
          size={tokens.size.icon.sm}
          color={disabled ? s.chevronDisabled.color as string : s.chevron.color as string}
        />
      </View>
    </TouchableOpacity>
  );
}

export default MealNutritionRow;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.md,
    minHeight: tokens.size.touchTarget.md,
    borderTopWidth: tokens.borderWidth.default,
    borderTopColor: colors.border.default,
    borderBottomWidth: tokens.borderWidth.default,
    borderBottomColor: colors.border.default,
  },
  containerDisabled: {
    opacity: tokens.opacity.disabled,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.component.sm,
  },
  title: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.text.primary,
  },
  titleDisabled: {
    color: colors.text.disabled,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.component.sm,
  },
  badge: {
    backgroundColor: colors.interactive.subtle,
    paddingHorizontal: tokens.spacing.component.sm,
    paddingVertical: tokens.spacing.component.xs / 2,
    borderRadius: tokens.radius.sm,
  },
  badgeDisabled: {
    backgroundColor: colors.bg.disabled,
  },
  badgeText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: colors.interactive.primary,
  },
  badgeTextDisabled: {
    color: colors.text.disabled,
  },
  chevron: {
    color: colors.text.tertiary,
  },
  chevronDisabled: {
    color: colors.text.disabled,
  },
}));

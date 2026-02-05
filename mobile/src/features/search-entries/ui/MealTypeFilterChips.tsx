/**
 * MealTypeFilterChips - Horizontal meal type filter chips
 *
 * Toggleable chips for filtering by meal type.
 * Multiple selection allowed.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/theme';
import { tokens } from '@/shared/ui/tokens';
import { MealType } from '@/entities/meal';
import { useCommonI18n } from '@/shared/lib/i18n';

// =============================================================================
// TYPES
// =============================================================================

export interface MealTypeFilterChipsProps {
  selected: MealType[];
  onChange: (selected: MealType[]) => void;
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const MealTypeFilterChips = memo(function MealTypeFilterChips({
  selected,
  onChange,
  disabled = false,
}: MealTypeFilterChipsProps) {
  const { colors } = useTheme();
  const common = useCommonI18n();

  const MEAL_TYPE_OPTIONS = useMemo(() => [
    { value: MealType.BREAKFAST, label: common.mealTypeBreakfast, icon: 'sunny-outline' },
    { value: MealType.LUNCH, label: common.mealTypeLunch, icon: 'sunny' },
    { value: MealType.DINNER, label: common.mealTypeDinner, icon: 'moon-outline' },
    { value: MealType.SNACK, label: common.mealTypeSnack, icon: 'nutrition-outline' },
    { value: MealType.DESSERT, label: common.mealTypeDessert, icon: 'ice-cream-outline' },
    { value: MealType.DRINK, label: common.mealTypeDrink, icon: 'cafe-outline' },
    { value: MealType.OTHER, label: common.mealTypeOther, icon: 'ellipsis-horizontal-circle-outline' },
  ], [common.mealTypeBreakfast, common.mealTypeLunch, common.mealTypeDinner, common.mealTypeSnack, common.mealTypeDessert, common.mealTypeDrink, common.mealTypeOther]);

  const handlePress = useCallback(
    (mealType: MealType) => {
      if (disabled) return;

      if (selected.includes(mealType)) {
        // Remove from selection
        onChange(selected.filter((t) => t !== mealType));
      } else {
        // Add to selection
        onChange([...selected, mealType]);
      }
    },
    [disabled, selected, onChange]
  );

  const isSelected = useCallback(
    (mealType: MealType) => selected.includes(mealType),
    [selected]
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {MEAL_TYPE_OPTIONS.map((option) => {
        const active = isSelected(option.value);
        return (
          <Pressable
            key={option.value}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.interactive.primary : colors.bg.secondary,
                borderColor: active ? colors.interactive.primary : colors.border.default,
              },
            ]}
            onPress={() => handlePress(option.value)}
            disabled={disabled}
          >
            <Ionicons
              name={option.icon as any}
              size={14}
              color={active ? colors.text.inverse : colors.text.secondary}
            />
            <Text
              style={[
                styles.chipText,
                { color: active ? colors.text.inverse : colors.text.primary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: tokens.spacing.component.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.xs,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    gap: tokens.spacing.component.xs,
  },
  chipText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
  },
});

export default MealTypeFilterChips;

/**
 * MealTypeFilterChips - Horizontal meal type filter chips
 *
 * Toggleable chips for filtering by meal type.
 * Multiple selection allowed.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design-system/theme';
import { tokens } from '@/design-system/tokens';
import { MealType } from '@/entities/meal';

// =============================================================================
// TYPES
// =============================================================================

export interface MealTypeFilterChipsProps {
  selected: MealType[];
  onChange: (selected: MealType[]) => void;
  disabled?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MEAL_TYPE_OPTIONS: { value: MealType; label: string; icon: string }[] = [
  { value: MealType.BREAKFAST, label: '아침', icon: 'sunny-outline' },
  { value: MealType.LUNCH, label: '점심', icon: 'sunny' },
  { value: MealType.DINNER, label: '저녁', icon: 'moon-outline' },
  { value: MealType.SNACK, label: '간식', icon: 'nutrition-outline' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function MealTypeFilterChips({
  selected,
  onChange,
  disabled = false,
}: MealTypeFilterChipsProps) {
  const { colors } = useTheme();

  const handlePress = (mealType: MealType) => {
    if (disabled) return;

    if (selected.includes(mealType)) {
      // Remove from selection
      onChange(selected.filter((t) => t !== mealType));
    } else {
      // Add to selection
      onChange([...selected, mealType]);
    }
  };

  const isSelected = (mealType: MealType) => selected.includes(mealType);

  return (
    <View style={styles.container}>
      {MEAL_TYPE_OPTIONS.map((option) => {
        const active = isSelected(option.value);
        return (
          <TouchableOpacity
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
            activeOpacity={0.7}
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
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

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

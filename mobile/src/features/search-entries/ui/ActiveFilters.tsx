/**
 * ActiveFilters - Shows currently applied filters with remove option
 *
 * Only renders when filters are active.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design-system/theme';
import { tokens } from '@/design-system/tokens';
import { MealType } from '@/entities/meal';
import type { DatePreset } from './DateQuickFilters';

// =============================================================================
// TYPES
// =============================================================================

export interface ActiveFilter {
  type: 'mealType' | 'date' | 'search';
  value: string;
  label: string;
}

export interface ActiveFiltersProps {
  searchQuery?: string | undefined;
  mealTypes: MealType[];
  datePreset: DatePreset;
  customDateLabel?: string | undefined;
  onRemoveSearch?: (() => void) | undefined;
  onRemoveMealType?: ((mealType: MealType) => void) | undefined;
  onRemoveDate?: (() => void) | undefined;
  onClearAll?: (() => void) | undefined;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  [MealType.BREAKFAST]: '아침',
  [MealType.LUNCH]: '점심',
  [MealType.DINNER]: '저녁',
  [MealType.SNACK]: '간식',
};

const DATE_PRESET_LABELS: Record<string, string> = {
  today: '오늘',
  week: '이번 주',
  month: '이번 달',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ActiveFilters({
  searchQuery,
  mealTypes,
  datePreset,
  customDateLabel,
  onRemoveSearch,
  onRemoveMealType,
  onRemoveDate,
  onClearAll,
}: ActiveFiltersProps) {
  const { colors } = useTheme();

  // Build list of active filters
  const filters: ActiveFilter[] = [];

  if (searchQuery) {
    filters.push({
      type: 'search',
      value: searchQuery,
      label: `"${searchQuery}"`,
    });
  }

  mealTypes.forEach((mealType) => {
    filters.push({
      type: 'mealType',
      value: mealType,
      label: MEAL_TYPE_LABELS[mealType],
    });
  });

  if (datePreset) {
    const label = datePreset === 'custom'
      ? customDateLabel || '직접 선택'
      : DATE_PRESET_LABELS[datePreset] || datePreset;
    filters.push({
      type: 'date',
      value: datePreset,
      label,
    });
  }

  // Don't render if no filters active
  if (filters.length === 0) {
    return null;
  }

  const handleRemove = (filter: ActiveFilter) => {
    switch (filter.type) {
      case 'search':
        onRemoveSearch?.();
        break;
      case 'mealType':
        onRemoveMealType?.(filter.value as MealType);
        break;
      case 'date':
        onRemoveDate?.();
        break;
    }
  };

  return (
    <View style={styles.container}>
      {filters.map((filter, index) => (
        <TouchableOpacity
          key={`${filter.type}-${filter.value}-${index}`}
          style={[styles.chip, { backgroundColor: colors.bg.tertiary }]}
          onPress={() => handleRemove(filter)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, { color: colors.text.secondary }]}>
            {filter.label}
          </Text>
          <Ionicons name="close" size={12} color={colors.text.secondary} />
        </TouchableOpacity>
      ))}

      {filters.length > 1 && onClearAll && (
        <TouchableOpacity
          style={styles.clearAll}
          onPress={onClearAll}
          activeOpacity={0.7}
        >
          <Text style={[styles.clearAllText, { color: colors.text.tertiary }]}>
            전체 해제
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.component.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.component.sm,
    paddingVertical: tokens.spacing.component.xs,
    borderRadius: tokens.radius.sm,
    gap: tokens.spacing.component.xs,
  },
  chipText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.normal,
  },
  clearAll: {
    paddingHorizontal: tokens.spacing.component.sm,
    paddingVertical: tokens.spacing.component.xs,
  },
  clearAllText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
  },
});

export default ActiveFilters;

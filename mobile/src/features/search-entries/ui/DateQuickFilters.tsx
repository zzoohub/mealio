/**
 * DateQuickFilters - Quick date filter chips
 *
 * Single select date range presets.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/ui/theme';
import { tokens } from '@/shared/ui/tokens';

// =============================================================================
// TYPES
// =============================================================================

export type DatePreset = 'today' | 'week' | 'month' | 'custom' | null;

export interface DateQuickFiltersProps {
  selected: DatePreset;
  onChange: (preset: DatePreset) => void;
  onCustomPress?: () => void;
  disabled?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
  { value: 'custom', label: '직접 선택' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function DateQuickFilters({
  selected,
  onChange,
  onCustomPress,
  disabled = false,
}: DateQuickFiltersProps) {
  const { colors } = useTheme();

  const handlePress = (preset: DatePreset) => {
    if (disabled) return;

    if (preset === 'custom') {
      onCustomPress?.();
    } else if (selected === preset) {
      // Deselect if tapping same preset
      onChange(null);
    } else {
      onChange(preset);
    }
  };

  return (
    <View style={styles.container}>
      {DATE_PRESETS.map((option) => {
        const active = selected === option.value;
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
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.xs,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
  },
});

export default DateQuickFilters;

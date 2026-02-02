/**
 * DateQuickFilters - Quick date filter chips
 *
 * Single select date range presets.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/ui/theme';
import { tokens } from '@/shared/ui/tokens';
import { useDiaryI18n, useCommonI18n } from '@/shared/lib/i18n';

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
// COMPONENT
// =============================================================================

export function DateQuickFilters({
  selected,
  onChange,
  onCustomPress,
  disabled = false,
}: DateQuickFiltersProps) {
  const { colors } = useTheme();
  const diary = useDiaryI18n();
  const common = useCommonI18n();

  const DATE_PRESETS = useMemo((): { value: DatePreset; label: string }[] => [
    { value: 'today', label: diary.today },
    { value: 'week', label: diary.thisWeek },
    { value: 'month', label: diary.thisMonth },
    { value: 'custom', label: common.customSelect },
  ], [diary.today, diary.thisWeek, diary.thisMonth, common.customSelect]);

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

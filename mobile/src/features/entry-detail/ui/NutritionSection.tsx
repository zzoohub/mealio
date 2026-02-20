/**
 * NutritionSection - Manual nutrition input and display
 *
 * Never returns null — always renders.
 * Three states: empty (CTA), view (grid), edit (inputs).
 *
 * @example
 * ```tsx
 * <NutritionSection
 *   nutrition={{ calories: 450, protein: 35, fat: 12 }}
 *   onNutritionChange={(nutrition) => update({ nutrition })}
 * />
 * ```
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles } from '@/shared/ui/theme';
import type { NutritionInfo } from '@/entities/meal';
import { useDiaryI18n, useCommonI18n } from '@/shared/lib/i18n';

// =============================================================================
// TYPES
// =============================================================================

export interface NutritionSectionProps {
  /** Nutrition information */
  nutrition?: NutritionInfo | null | undefined;
  /** Callback when nutrition changes */
  onNutritionChange?: ((nutrition: NutritionInfo) => void) | undefined;
  /** Whether editing is disabled */
  disabled?: boolean | undefined;
  /** Whether AI analysis is loading */
  loading?: boolean | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

const ALL_NUTRIENTS: (keyof NutritionInfo)[] = ['calories', 'carbs', 'protein', 'fat', 'sugar', 'sodium'];

const NUTRITION_INPUT_HEIGHT = 28;

const EMPTY_NUTRITION: NutritionInfo = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 };

function hasNutritionData(nutrition: NutritionInfo | null | undefined): boolean {
  if (!nutrition) return false;
  return Object.values(nutrition).some((v) => typeof v === 'number' && v > 0);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function NutritionSection({
  nutrition,
  onNutritionChange,
  disabled = false,
  loading = false,
  testID,
}: NutritionSectionProps) {
  const s = useStyles(styles);
  const diary = useDiaryI18n();
  const common = useCommonI18n();

  const NUTRITION_LABELS: Partial<Record<keyof NutritionInfo, { label: string; unit: string }>> = useMemo(() => ({
    calories: { label: diary.nutritionCalories, unit: 'kcal' },
    carbs: { label: diary.nutritionCarbs, unit: 'g' },
    protein: { label: diary.nutritionProtein, unit: 'g' },
    fat: { label: diary.nutritionFat, unit: 'g' },
    sugar: { label: diary.nutritionSugar, unit: 'g' },
    sodium: { label: diary.nutritionSodium, unit: 'mg' },
  }), [diary.nutritionCalories, diary.nutritionCarbs, diary.nutritionProtein, diary.nutritionFat, diary.nutritionSugar, diary.nutritionSodium]);

  const [isEditing, setIsEditing] = useState(false);
  const [localNutrition, setLocalNutrition] = useState<NutritionInfo>(
    nutrition || { ...EMPTY_NUTRITION }
  );

  // Sync local state with props
  useEffect(() => {
    if (nutrition) {
      setLocalNutrition(nutrition);
    }
  }, [nutrition]);

  const hasData = hasNutritionData(nutrition);

  const handleEditToggle = () => {
    if (isEditing) {
      onNutritionChange?.(localNutrition);
    }
    setIsEditing(!isEditing);
  };

  const handleEmptyPress = () => {
    setLocalNutrition({ ...EMPTY_NUTRITION });
    setIsEditing(true);
  };

  const handleNutritionChange = (key: keyof NutritionInfo, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setLocalNutrition((prev) => ({ ...prev, [key]: numValue }));
  };

  const nutritionEntries = ALL_NUTRIENTS
    .filter((key) => NUTRITION_LABELS[key])
    .map((key) => ({
      key,
      value: localNutrition[key] ?? 0,
      ...NUTRITION_LABELS[key]!,
    }));

  // =========================================================================
  // EMPTY STATE
  // =========================================================================

  if (!hasData && !isEditing) {
    if (loading) {
      return (
        <View style={s.container} testID={testID}>
          <View style={s.loadingCard}>
            <ActivityIndicator size="small" color={s.loadingSpinner.color as string} />
            <Text style={s.loadingText}>{diary.aiAnalyzing}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={s.container} testID={testID}>
        <Pressable
          style={s.emptyCard}
          onPress={disabled ? undefined : handleEmptyPress}
          disabled={disabled}
          accessibilityLabel={diary.addNutrition}
          accessibilityRole="button"
          testID={testID ? `${testID}-empty-cta` : undefined}
        >
          <Ionicons
            name="restaurant-outline"
            size={tokens.size.icon.sm}
            color={s.emptyIcon.color as string}
          />
          <Text style={s.emptyText}>{diary.addNutrition}</Text>
        </Pressable>
      </View>
    );
  }

  // =========================================================================
  // VIEW / EDIT STATE
  // =========================================================================

  return (
    <View style={s.container} testID={testID}>
      {/* Section Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons
            name="restaurant-outline"
            size={tokens.size.icon.xs}
            color={s.headerIcon.color as string}
          />
          <Text style={s.headerText}>{diary.nutritionInfo}</Text>
        </View>
        {!disabled && onNutritionChange && (
          <Pressable
            style={s.editButton}
            onPress={handleEditToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={isEditing ? diary.editDone : diary.editNutrition}
            accessibilityRole="button"
          >
            <Text style={s.editButtonText}>
              {isEditing ? common.done : common.edit}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Nutrition Grid */}
      <View style={s.nutritionGrid}>
        {nutritionEntries.map((item) => (
          <View key={item.key} style={s.nutritionItem}>
            <Text style={s.nutritionLabel}>{item.label}</Text>
            <View style={s.nutritionInputRow}>
              <TextInput
                style={[s.nutritionInput, !isEditing && s.nutritionInputDisabled]}
                value={String(item.value || '')}
                onChangeText={(v) => handleNutritionChange(item.key, v)}
                keyboardType="numeric"
                selectTextOnFocus
                editable={isEditing}
                testID={testID ? `${testID}-input-${item.key}` : undefined}
              />
              <Text style={s.nutritionUnit}>{item.unit}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default NutritionSection;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.layout.md,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.component.sm,
    paddingVertical: tokens.spacing.component.md,
    borderRadius: tokens.radius.md,
    backgroundColor: colors.bg.secondary,
  },
  loadingSpinner: {
    color: colors.interactive.primary,
  },
  loadingText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.normal,
    color: colors.text.secondary,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.component.sm,
    paddingVertical: tokens.spacing.component.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
    backgroundColor: colors.bg.secondary,
  },
  emptyIcon: {
    color: colors.text.tertiary,
  },
  emptyText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.layout.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.component.xs,
  },
  headerIcon: {
    color: colors.interactive.primary,
  },
  headerText: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editButton: {
    paddingVertical: tokens.spacing.component.xs,
    paddingHorizontal: tokens.spacing.component.sm,
  },
  editButtonText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.interactive.primary,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.component.sm,
  },
  nutritionItem: {
    backgroundColor: colors.bg.secondary,
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.sm,
    borderRadius: tokens.radius.md,
    minWidth: '45%',
    flexGrow: 1,
  },
  nutritionLabel: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.normal,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  nutritionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.component.xs,
    height: NUTRITION_INPUT_HEIGHT,
  },
  nutritionInput: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: colors.text.primary,
    backgroundColor: colors.bg.primary,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.component.sm,
    paddingVertical: 0,
    minWidth: 50,
    height: NUTRITION_INPUT_HEIGHT,
    textAlign: 'right',
  },
  nutritionInputDisabled: {
    backgroundColor: 'transparent',
  },
  nutritionUnit: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.normal,
    color: colors.text.tertiary,
  },
}));

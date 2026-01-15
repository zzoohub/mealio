/**
 * AIAnalysisSection - Displays AI-analyzed ingredients and nutrition
 *
 * Only renders when AI analysis data is available.
 * Ingredients shown as horizontal chip list (editable).
 * Nutrition shown as key-value grid (editable).
 *
 * @example
 * ```tsx
 * <AIAnalysisSection
 *   ingredients={['닭가슴살', '현미밥', '브로콜리']}
 *   nutrition={{ calories: 450, protein: 35, carbs: 40, fat: 12 }}
 *   onIngredientsChange={(ingredients) => update({ ingredients })}
 *   onNutritionChange={(nutrition) => update({ nutrition })}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/design-system/tokens';
import { createStyles, useStyles, useTheme } from '@/design-system/theme';
import type { NutritionInfo } from '@/entities/meal';

// =============================================================================
// TYPES
// =============================================================================

export interface AIAnalysisSectionProps {
  /** List of detected ingredients */
  ingredients?: string[] | null | undefined;
  /** Nutrition information */
  nutrition?: NutritionInfo | null | undefined;
  /** Callback when ingredients change */
  onIngredientsChange?: ((ingredients: string[]) => void) | undefined;
  /** Callback when nutrition changes */
  onNutritionChange?: ((nutrition: NutritionInfo) => void) | undefined;
  /** Whether editing is disabled */
  disabled?: boolean | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const NUTRITION_LABELS: Record<keyof NutritionInfo, { label: string; unit: string }> = {
  calories: { label: '칼로리', unit: 'kcal' },
  protein: { label: '단백질', unit: 'g' },
  carbs: { label: '탄수화물', unit: 'g' },
  fat: { label: '지방', unit: 'g' },
  fiber: { label: '식이섬유', unit: 'g' },
  sugar: { label: '당류', unit: 'g' },
  sodium: { label: '나트륨', unit: 'mg' },
  water: { label: '수분', unit: 'ml' },
};

// Primary nutrients to always show first
const PRIMARY_NUTRIENTS: (keyof NutritionInfo)[] = ['calories', 'protein', 'carbs', 'fat'];

// =============================================================================
// COMPONENT
// =============================================================================

export function AIAnalysisSection({
  ingredients,
  nutrition,
  onIngredientsChange,
  onNutritionChange,
  disabled = false,
  testID,
}: AIAnalysisSectionProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [localIngredients, setLocalIngredients] = useState<string[]>(ingredients || []);
  const [localNutrition, setLocalNutrition] = useState<NutritionInfo>(
    nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const [newIngredient, setNewIngredient] = useState('');

  // Sync local state with props
  useEffect(() => {
    setLocalIngredients(ingredients || []);
  }, [ingredients]);

  useEffect(() => {
    if (nutrition) {
      setLocalNutrition(nutrition);
    }
  }, [nutrition]);

  // Don't render if no data and not editing
  if (!ingredients?.length && !nutrition && !isEditing) {
    return null;
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      onIngredientsChange?.(localIngredients);
      onNutritionChange?.(localNutrition);
    }
    setIsEditing(!isEditing);
  };

  const handleRemoveIngredient = (index: number) => {
    const updated = localIngredients.filter((_, i) => i !== index);
    setLocalIngredients(updated);
  };

  const handleAddIngredient = () => {
    const trimmed = newIngredient.trim();
    if (trimmed && !localIngredients.includes(trimmed)) {
      setLocalIngredients([...localIngredients, trimmed]);
      setNewIngredient('');
    }
  };

  const handleNutritionChange = (key: keyof NutritionInfo, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setLocalNutrition((prev) => ({ ...prev, [key]: numValue }));
  };

  // Filter nutrition entries that have values
  const nutritionEntries = PRIMARY_NUTRIENTS.map((key) => ({
    key,
    value: localNutrition[key] ?? 0,
    ...NUTRITION_LABELS[key],
  }));

  return (
    <View style={s.container} testID={testID}>
      {/* Section Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons
            name="sparkles"
            size={tokens.size.icon.xs}
            color={s.headerIcon.color as string}
          />
          <Text style={s.headerText}>AI 분석</Text>
        </View>
        {!disabled && (onIngredientsChange || onNutritionChange) && (
          <TouchableOpacity
            style={s.editButton}
            onPress={handleEditToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={isEditing ? "수정 완료" : "영양정보 수정"}
            accessibilityRole="button"
          >
            <Text style={s.editButtonText}>
              {isEditing ? '완료' : '수정'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ingredients */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>재료</Text>
        <View style={s.ingredientsList}>
          {localIngredients.map((ingredient, index) => (
            <View key={index} style={s.ingredientChipWrapper}>
              <View style={s.ingredientChip}>
                <Text style={s.ingredientText}>{ingredient}</Text>
              </View>
              {isEditing && (
                <TouchableOpacity
                  onPress={() => handleRemoveIngredient(index)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={s.removeButton}
                >
                  <View style={s.removeButtonInner}>
                    <Ionicons name="close" size={10} color={colors.bg.primary} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {isEditing && (
            <View style={s.addIngredientContainer}>
              <TextInput
                style={s.addIngredientInput}
                value={newIngredient}
                onChangeText={setNewIngredient}
                placeholder="추가..."
                placeholderTextColor={colors.text.tertiary}
                onSubmitEditing={handleAddIngredient}
                returnKeyType="done"
              />
              {newIngredient.trim() && (
                <TouchableOpacity onPress={handleAddIngredient} style={s.addButton}>
                  <Ionicons name="add" size={16} color={colors.interactive.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Nutrition */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>영양정보</Text>
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
                />
                <Text style={s.nutritionUnit}>{item.unit}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default AIAnalysisSection;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.layout.md,
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
  section: {
    marginBottom: tokens.spacing.layout.sm,
  },
  sectionLabel: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: tokens.spacing.component.sm,
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.component.sm,
    alignItems: 'flex-start',
    paddingTop: tokens.spacing.component.xs,
  },
  ingredientChipWrapper: {
    position: 'relative',
  },
  ingredientChip: {
    backgroundColor: colors.bg.secondary,
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.sm,
    borderRadius: tokens.radius.full,
  },
  ingredientText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.normal,
    color: colors.text.primary,
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 1,
  },
  removeButtonInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.text.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIngredientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    paddingLeft: tokens.spacing.component.md,
    paddingRight: tokens.spacing.component.sm,
    paddingVertical: tokens.spacing.component.xs,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  addIngredientInput: {
    fontSize: tokens.typography.fontSize.bodySmall,
    color: colors.text.primary,
    minWidth: 60,
    padding: 0,
  },
  addButton: {
    marginLeft: tokens.spacing.component.xs,
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
  nutritionValue: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  nutritionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.component.xs,
    height: 28,
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
    height: 28,
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

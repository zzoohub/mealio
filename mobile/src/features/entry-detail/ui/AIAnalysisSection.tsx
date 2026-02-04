/**
 * IngredientsSection - Displays and edits ingredient chips
 *
 * Only renders when ingredients exist or user is editing.
 *
 * @example
 * ```tsx
 * <IngredientsSection
 *   ingredients={['닭가슴살', '현미밥', '브로콜리']}
 *   onIngredientsChange={(ingredients) => update({ ingredients })}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles, useTheme } from '@/shared/ui/theme';
import { useDiaryI18n, useCommonI18n } from '@/shared/lib/i18n';

// =============================================================================
// TYPES
// =============================================================================

export interface IngredientsSectionProps {
  /** List of detected ingredients */
  ingredients?: string[] | null | undefined;
  /** Callback when ingredients change */
  onIngredientsChange?: ((ingredients: string[]) => void) | undefined;
  /** Whether editing is disabled */
  disabled?: boolean | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

/** @deprecated Use IngredientsSectionProps instead */
export type AIAnalysisSectionProps = IngredientsSectionProps;

// =============================================================================
// COMPONENT
// =============================================================================

export function IngredientsSection({
  ingredients,
  onIngredientsChange,
  disabled = false,
  testID,
}: IngredientsSectionProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();
  const diary = useDiaryI18n();
  const common = useCommonI18n();

  const [isEditing, setIsEditing] = useState(false);
  const [localIngredients, setLocalIngredients] = useState<string[]>(ingredients || []);
  const [newIngredient, setNewIngredient] = useState('');

  // Sync local state with props
  useEffect(() => {
    setLocalIngredients(ingredients || []);
  }, [ingredients]);

  // Don't render if no data and not editing
  if (!ingredients?.length && !isEditing) {
    return null;
  }

  const handleEditToggle = () => {
    if (isEditing) {
      onIngredientsChange?.(localIngredients);
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

  return (
    <View style={s.container} testID={testID}>
      {/* Section Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons
            name="leaf-outline"
            size={tokens.size.icon.xs}
            color={s.headerIcon.color as string}
          />
          <Text style={s.headerText}>{diary.ingredients}</Text>
        </View>
        {!disabled && onIngredientsChange && (
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

      {/* Ingredients */}
      <View style={s.ingredientsList}>
        {localIngredients.map((ingredient, index) => (
          <View key={index} style={s.ingredientChipWrapper}>
            <View style={s.ingredientChip}>
              <Text style={s.ingredientText}>{ingredient}</Text>
            </View>
            {isEditing && (
              <Pressable
                onPress={() => handleRemoveIngredient(index)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={s.removeButton}
              >
                <View style={s.removeButtonInner}>
                  <Ionicons name="close" size={10} color={colors.bg.primary} />
                </View>
              </Pressable>
            )}
          </View>
        ))}
        {isEditing && (
          <View style={s.addIngredientContainer}>
            <TextInput
              style={s.addIngredientInput}
              value={newIngredient}
              onChangeText={setNewIngredient}
              placeholder={diary.addIngredient}
              placeholderTextColor={colors.text.tertiary}
              onSubmitEditing={handleAddIngredient}
              returnKeyType="done"
            />
            {newIngredient.trim() && (
              <Pressable onPress={handleAddIngredient} style={s.addButton}>
                <Ionicons name="add" size={16} color={colors.interactive.primary} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/** @deprecated Use IngredientsSection instead */
export const AIAnalysisSection = IngredientsSection;

export default IngredientsSection;

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
}));

import React from 'react';
import {
  View,
  StyleSheet,
  AccessibilityProps,
} from 'react-native';
import { useTheme } from '@/lib/theme';
import { SPACING } from '@/constants';
import { MealPhotoCard, MealPhotoData } from './MealPhotoCard';
import type { BaseComponentProps } from '@/types';

export interface MealPhotoGridProps extends BaseComponentProps {
  /** Array of meal photos to display */
  meals: MealPhotoData[];
  /** Number of columns in the grid */
  columns?: 3 | 4;
  /** Size of each photo card */
  cardSize?: 'small' | 'medium' | 'large';
  /** Callback when a meal card is pressed */
  onMealPress?: (meal: MealPhotoData) => void;
  /** Callback when a meal card is long pressed */
  onMealLongPress?: (meal: MealPhotoData) => void;
}

/**
 * MealPhotoGrid - Grid layout for meal photos
 *
 * Displays meal photos in a responsive grid layout.
 * Wraps MealPhotoCard components with proper spacing.
 *
 * Features:
 * - Configurable column count (3 or 4)
 * - Responsive card sizing
 * - Proper spacing using design tokens
 * - Accessibility support for grid navigation
 *
 * @example
 * ```tsx
 * <MealPhotoGrid
 *   meals={[
 *     { id: '1', photoUri: '...', time: '12:30' },
 *     { id: '2', photoUri: '...', time: '14:20' },
 *     { id: '3', photoUri: '...', time: '19:15' },
 *   ]}
 *   columns={3}
 *   cardSize="medium"
 *   onMealPress={(meal) => navigateToDetail(meal.id)}
 * />
 * ```
 */
export function MealPhotoGrid({
  meals,
  columns = 3,
  cardSize = 'medium',
  onMealPress,
  onMealLongPress,
  testID,
  style,
}: MealPhotoGridProps) {
  const { theme } = useTheme();

  const accessibilityProps: AccessibilityProps = {
    accessible: true,
    accessibilityRole: 'list',
    accessibilityLabel: `Meal photos grid with ${meals.length} items`,
  };

  // Calculate gap based on columns
  const gap = columns === 3 ? SPACING.lg : SPACING.md;

  return (
    <View
      style={[
        styles.container,
        style,
      ]}
      testID={testID}
      {...accessibilityProps}
    >
      <View
        style={[
          styles.grid,
          {
            gap,
          },
        ]}
      >
        {meals.map((meal) => (
          <MealPhotoCard
            key={meal.id}
            meal={meal}
            size={cardSize}
            onPress={() => onMealPress?.(meal)}
            onLongPress={() => onMealLongPress?.(meal)}
            testID={`${testID}-meal-${meal.id}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
});

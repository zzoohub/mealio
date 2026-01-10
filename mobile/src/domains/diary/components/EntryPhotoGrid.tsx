/**
 * EntryPhotoGrid - Grid layout for entry photos
 *
 * Displays entry photos in a responsive grid layout.
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
 * <EntryPhotoGrid
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

import React from 'react';
import { View } from 'react-native';
import { Stack } from '@/design-system/styled';
import { MealPhotoCard, MealPhotoData } from './MealPhotoCard';
import type { BaseComponentProps } from '@/types';

export interface EntryPhotoGridProps extends BaseComponentProps {
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

export function EntryPhotoGrid({
  meals,
  columns = 3,
  cardSize = 'medium',
  onMealPress,
  onMealLongPress,
  testID,
  style,
}: EntryPhotoGridProps) {
  // Calculate gap based on columns
  const gap = columns === 3 ? 'lg' : 'md';

  return (
    <View
      style={[{ flex: 1 }, style]}
      testID={testID}
      accessible={true}
      accessibilityRole="list"
      accessibilityLabel={`Meal photos grid with ${meals.length} items`}
    >
      <Stack
        direction="horizontal"
        gap={gap}
        wrap
        align="start"
        justify="start"
      >
        {meals.map((meal) => (
          <MealPhotoCard
            key={meal.id}
            meal={meal}
            size={cardSize}
            onPress={onMealPress ? () => onMealPress(meal) : undefined}
            onLongPress={onMealLongPress ? () => onMealLongPress(meal) : undefined}
            testID={testID ? `${testID}-meal-${meal.id}` : undefined}
          />
        ))}
      </Stack>
    </View>
  );
}

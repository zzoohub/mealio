/**
 * EntryPhotoGrid - Grid layout for entry photos
 *
 * Displays entry photos in a responsive grid layout.
 * Uses FlashList for virtualized rendering performance.
 *
 * Features:
 * - Configurable column count (3 or 4)
 * - Virtualized list for performance
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

import React, { useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MealPhotoCard, type MealPhotoData } from '@/entities/meal';
import type { BaseComponentProps } from '@/shared/types';
import { tokens } from '@/shared/ui/tokens';

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// CONSTANTS
// =============================================================================

const GAP = tokens.spacing.component.md;

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryPhotoGrid({
  meals,
  columns = 3,
  cardSize = 'medium',
  onMealPress,
  onMealLongPress,
  testID,
  style,
}: EntryPhotoGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const renderItem = useCallback(
    ({ item }: { item: MealPhotoData }) => (
      <MealPhotoCard
        meal={item}
        size={cardSize}
        onPress={onMealPress ? () => onMealPress(item) : undefined}
        onLongPress={onMealLongPress ? () => onMealLongPress(item) : undefined}
        testID={testID ? `${testID}-meal-${item.id}` : undefined}
      />
    ),
    [cardSize, onMealPress, onMealLongPress, testID]
  );

  const keyExtractor = useCallback((item: MealPhotoData) => item.id, []);

  return (
    <View
      style={[{ flex: 1 }, style]}
      testID={testID}
      accessible={true}
      accessibilityRole="list"
      accessibilityLabel={`Meal photos grid with ${meals.length} items`}
    >
      <FlashList
        data={meals}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={columns}
        estimatedItemSize={(screenWidth - GAP * (columns - 1)) / columns}
        contentContainerStyle={{ padding: GAP / 2 }}
      />
    </View>
  );
}

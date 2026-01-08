import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ViewStyle,
  ImageStyle,
  AccessibilityProps,
} from 'react-native';
import { useTheme } from '@/lib/theme';
import {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
  UI_CONSTANTS,
} from '@/constants';
import { createElevation } from '@/styles/tokens';
import type { BaseComponentProps } from '@/types';

/**
 * Meal photo data for display
 */
export interface MealPhotoData {
  /** Unique identifier */
  id: string;
  /** Photo URI (local or remote) */
  photoUri: string;
  /** Time of the meal (for display) */
  time: string;
  /** Optional meal name for accessibility */
  name?: string;
}

export interface MealPhotoCardProps extends BaseComponentProps {
  /** Meal photo data */
  meal: MealPhotoData;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Press handler - parent handles navigation/selection */
  onPress?: () => void;
  /** Long press handler - parent handles context menu */
  onLongPress?: () => void;
}

// Size configurations using design tokens
const SIZE_CONFIG = {
  small: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.xs,
  },
  medium: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.sm,
  },
  large: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZES.md,
  },
} as const;

/**
 * MealPhotoCard - Individual meal photo card with time display
 *
 * Pure UI component for displaying a meal photo thumbnail with time.
 * Used in the diary meal grid.
 *
 * Features:
 * - Responsive size variants
 * - Time display below photo
 * - Proper accessibility support
 * - Touch feedback states
 *
 * @example
 * ```tsx
 * <MealPhotoCard
 *   meal={{
 *     id: '123',
 *     photoUri: 'file://...',
 *     time: '12:30',
 *     name: 'Lunch'
 *   }}
 *   size="medium"
 *   onPress={() => navigateToMealDetail(meal.id)}
 * />
 * ```
 */
export function MealPhotoCard({
  meal,
  size = 'medium',
  onPress,
  onLongPress,
  testID,
  style,
}: MealPhotoCardProps) {
  const { theme } = useTheme();
  const config = SIZE_CONFIG[size];

  const accessibilityLabel = [
    meal.name || 'Meal',
    `at ${meal.time}`,
  ].join(' ');

  const accessibilityProps: AccessibilityProps = {
    accessible: true,
    accessibilityLabel,
    accessibilityRole: 'button',
    accessibilityHint: 'Double tap to view meal details',
  };

  const containerStyle: ViewStyle = {
    width: config.width,
    alignItems: 'center',
  };

  const imageContainerStyle: ViewStyle = {
    width: config.width,
    height: config.height,
    borderRadius: config.borderRadius,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...createElevation('sm'),
  };

  const imageStyle: ImageStyle = {
    width: '100%',
    height: '100%',
  };

  return (
    <Pressable
      style={({ pressed }) => [
        containerStyle,
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      testID={testID}
      {...accessibilityProps}
    >
      <View style={imageContainerStyle}>
        <Image
          source={{ uri: meal.photoUri }}
          style={imageStyle}
          resizeMode="cover"
          accessible={false}
        />
      </View>
      <Text
        style={[
          styles.timeText,
          {
            color: theme.colors.textSecondary,
            fontSize: config.fontSize,
          },
        ]}
        numberOfLines={1}
      >
        {meal.time}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  timeText: {
    fontWeight: FONT_WEIGHTS.medium,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

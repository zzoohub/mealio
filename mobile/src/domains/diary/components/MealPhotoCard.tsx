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

import React from 'react';
import {
  Image,
  Pressable,
  AccessibilityProps,
} from 'react-native';
import { Box, Text } from '@/design-system/styled';
import { createStyles, useStyles } from '@/design-system/theme';
import { tokens } from '@/design-system/tokens';
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

export interface MealPhotoCardProps {
  /** Meal photo data */
  meal: MealPhotoData;
  /** Size variant */
  size?: 'small' | 'medium' | 'large' | undefined;
  /** Press handler - parent handles navigation/selection */
  onPress?: (() => void) | undefined;
  /** Long press handler - parent handles context menu */
  onLongPress?: (() => void) | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
  /** Custom style */
  style?: any;
}

// Size configurations using design tokens
const SIZE_CONFIG = {
  small: {
    width: 80,
    height: 80,
    radius: 'md' as const,
    textVariant: 'caption' as const,
  },
  medium: {
    width: 100,
    height: 100,
    radius: 'lg' as const,
    textVariant: 'bodySmall' as const,
  },
  large: {
    width: 120,
    height: 120,
    radius: 'lg' as const,
    textVariant: 'body' as const,
  },
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function MealPhotoCard({
  meal,
  size = 'medium',
  onPress,
  onLongPress,
  testID,
  style,
}: MealPhotoCardProps) {
  const s = useStyles(styles);
  const config = SIZE_CONFIG[size];

  const imageContainerStyle = {
    small: s.imageContainerSmall,
    medium: s.imageContainerMedium,
    large: s.imageContainerLarge,
  }[size];

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

  return (
    <Pressable
      style={({ pressed }) => [
        { width: config.width, alignItems: 'center' as const },
        pressed && s.pressed,
        style,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      testID={testID}
      {...accessibilityProps}
    >
      <Box style={imageContainerStyle}>
        <Image
          source={{ uri: meal.photoUri }}
          style={s.image}
          resizeMode="cover"
          accessible={false}
        />
      </Box>
      <Text
        variant={config.textVariant}
        color="secondary"
        weight="medium"
        align="center"
        style={{ marginTop: tokens.spacing.component.xs }}
        numberOfLines={1}
      >
        {meal.time}
      </Text>
    </Pressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  image: {
    width: '100%' as const,
    height: '100%' as const,
  },
  pressed: {
    opacity: tokens.opacity.pressed,
    transform: [{ scale: 0.98 }],
  },
  imageContainerSmall: {
    width: SIZE_CONFIG.small.width,
    height: SIZE_CONFIG.small.height,
    borderRadius: tokens.radius[SIZE_CONFIG.small.radius],
    overflow: 'hidden' as const,
    backgroundColor: colors.bg.secondary,
  },
  imageContainerMedium: {
    width: SIZE_CONFIG.medium.width,
    height: SIZE_CONFIG.medium.height,
    borderRadius: tokens.radius[SIZE_CONFIG.medium.radius],
    overflow: 'hidden' as const,
    backgroundColor: colors.bg.secondary,
  },
  imageContainerLarge: {
    width: SIZE_CONFIG.large.width,
    height: SIZE_CONFIG.large.height,
    borderRadius: tokens.radius[SIZE_CONFIG.large.radius],
    overflow: 'hidden' as const,
    backgroundColor: colors.bg.secondary,
  },
}));

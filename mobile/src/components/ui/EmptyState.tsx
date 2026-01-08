import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AccessibilityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import {
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '@/constants';
import type { BaseComponentProps } from '@/types';

export interface EmptyStateProps extends BaseComponentProps {
  /** Icon name from Ionicons */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Primary message to display */
  title: string;
  /** Secondary description text */
  description?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Optional action slot - rendered below description */
  action?: ReactNode;
}

// Size configurations using design tokens
const SIZE_CONFIG = {
  small: {
    iconSize: 40,
    titleSize: FONT_SIZES.md,
    descriptionSize: FONT_SIZES.sm,
    spacing: SPACING.sm,
  },
  medium: {
    iconSize: 56,
    titleSize: FONT_SIZES.lg,
    descriptionSize: FONT_SIZES.md,
    spacing: SPACING.md,
  },
  large: {
    iconSize: 72,
    titleSize: FONT_SIZES.xl,
    descriptionSize: FONT_SIZES.md,
    spacing: SPACING.lg,
  },
} as const;

/**
 * EmptyState - Empty state placeholder component
 *
 * Displays a centered empty state with icon, title, and description.
 * Used when there is no content to display.
 *
 * Features:
 * - Icon display (optional)
 * - Primary title text
 * - Secondary description text (optional)
 * - Action slot for buttons/links
 * - Size variants
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon="restaurant-outline"
 *   title="No meals logged"
 *   description="Start by taking a photo of your meal"
 *   size="medium"
 *   action={
 *     <Button variant="primary" title="Add Meal" onPress={handleAddMeal} />
 *   }
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  size = 'medium',
  action,
  testID,
  style,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const config = SIZE_CONFIG[size];

  const accessibilityProps: AccessibilityProps = {
    accessible: true,
    accessibilityRole: 'text',
    accessibilityLabel: [title, description].filter(Boolean).join('. '),
  };

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      {...accessibilityProps}
    >
      {icon && (
        <View
          style={[
            styles.iconContainer,
            { marginBottom: config.spacing },
          ]}
        >
          <Ionicons
            name={icon}
            size={config.iconSize}
            color={theme.colors.textSecondary}
            accessible={false}
          />
        </View>
      )}

      <Text
        style={[
          styles.title,
          {
            fontSize: config.titleSize,
            color: theme.colors.text,
            marginBottom: description ? config.spacing / 2 : 0,
          },
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>

      {description && (
        <Text
          style={[
            styles.description,
            {
              fontSize: config.descriptionSize,
              color: theme.colors.textSecondary,
            },
          ]}
          numberOfLines={3}
        >
          {description}
        </Text>
      )}

      {action && (
        <View
          style={[
            styles.actionContainer,
            { marginTop: config.spacing },
          ]}
        >
          {action}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: FONT_WEIGHTS.semibold,
    textAlign: 'center',
  },
  description: {
    fontWeight: FONT_WEIGHTS.regular,
    textAlign: 'center',
    lineHeight: FONT_SIZES.md * 1.5,
  },
  actionContainer: {
    alignItems: 'center',
  },
});

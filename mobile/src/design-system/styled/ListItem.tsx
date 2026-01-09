/**
 * ListItem - Styled list item component
 *
 * Combines the useListItem headless hook with design tokens
 * to create a fully accessible, themed list item component.
 *
 * @example
 * ```tsx
 * <ListItem
 *   title="Settings"
 *   subtitle="Manage your preferences"
 *   leadingContent={<SettingsIcon />}
 *   trailingContent={<ChevronRightIcon />}
 *   onPress={() => navigate('Settings')}
 * />
 *
 * <ListItem
 *   title="Dark Mode"
 *   selected={isDarkMode}
 *   trailingContent={<Toggle checked={isDarkMode} />}
 *   onPress={() => toggleDarkMode()}
 *   selectionMode="single"
 * />
 * ```
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useListItem, type UseListItemProps } from '../headless';
import { tokens } from '../tokens';
import { createStyles, useStyles } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface ListItemProps extends UseListItemProps {
  /** Primary text */
  title: string;
  /** Secondary text */
  subtitle?: string;
  /** Tertiary/supporting text */
  description?: string;
  /** Content to display at the start (icon, avatar, etc.) */
  leadingContent?: React.ReactNode;
  /** Content to display at the end (chevron, toggle, etc.) */
  trailingContent?: React.ReactNode;
  /** Whether to show a divider below */
  showDivider?: boolean;
  /** Divider inset from leading edge */
  dividerInset?: 'none' | 'text' | 'full';
  /** Custom style for the container */
  style?: ViewStyle;
  /** Custom style for the title */
  titleStyle?: TextStyle;
  /** Custom style for the subtitle */
  subtitleStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

// =============================================================================
// ANIMATED PRESSABLE
// =============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// =============================================================================
// COMPONENT
// =============================================================================

export function ListItem({
  title,
  subtitle,
  description,
  leadingContent,
  trailingContent,
  showDivider = false,
  dividerInset = 'text',
  style,
  titleStyle,
  subtitleStyle,
  testID,
  ...hookProps
}: ListItemProps) {
  const s = useStyles(styles);
  const { listItemProps, leadingProps, trailingProps, state } = useListItem(hookProps);
  const { isSelected, isDisabled, isPressed } = state;

  // Destructure web-only props from listItemProps
  const { tabIndex, onKeyDown, ...pressableListItemProps } = listItemProps;

  // Animation for press state
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: isPressed
        ? withTiming(s.pressedBg.backgroundColor as string, { duration: tokens.duration.fast })
        : withTiming('transparent', { duration: tokens.duration.fast }),
    };
  });

  // Calculate divider inset
  const getDividerInset = () => {
    switch (dividerInset) {
      case 'none':
        return 0;
      case 'full':
        return tokens.spacing.component.lg;
      case 'text':
      default:
        // Inset to align with text (accounting for leading content)
        return leadingContent
          ? tokens.spacing.component.lg + tokens.size.icon.md + tokens.spacing.component.md
          : tokens.spacing.component.lg;
    }
  };

  // Render leading content with proper styling
  const renderLeadingContent = () => {
    if (!leadingContent) return null;

    const iconColor = isDisabled
      ? (s.iconDisabled.color as string)
      : isSelected
      ? (s.iconSelected.color as string)
      : (s.iconDefault.color as string);

    return (
      <View style={s.leading} {...leadingProps}>
        {React.isValidElement(leadingContent)
          ? React.cloneElement(
              leadingContent as React.ReactElement<{ color?: string; size?: number }>,
              {
                color: iconColor,
                size: tokens.size.icon.md,
              }
            )
          : leadingContent}
      </View>
    );
  };

  // Render trailing content
  const renderTrailingContent = () => {
    if (!trailingContent) return null;

    const iconColor = isDisabled
      ? (s.iconDisabled.color as string)
      : (s.trailingIconDefault.color as string);

    return (
      <View style={s.trailing} {...trailingProps}>
        {React.isValidElement(trailingContent)
          ? React.cloneElement(
              trailingContent as React.ReactElement<{ color?: string; size?: number }>,
              {
                color: iconColor,
                size: tokens.size.icon.sm,
              }
            )
          : trailingContent}
      </View>
    );
  };

  return (
    <View testID={testID}>
      <AnimatedPressable
        {...pressableListItemProps}
        style={[
          s.container,
          isSelected ? s.containerSelected : undefined,
          isDisabled ? s.disabled : undefined,
          animatedStyle,
          style,
        ]}
      >
        {/* Leading content */}
        {renderLeadingContent()}

        {/* Text content */}
        <View style={s.content}>
          <Text
            style={[
              s.title,
              isDisabled && s.titleDisabled,
              isSelected && s.titleSelected,
              titleStyle,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {subtitle && (
            <Text
              style={[
                s.subtitle,
                isDisabled && s.subtitleDisabled,
                subtitleStyle,
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}

          {description && (
            <Text
              style={[
                s.description,
                isDisabled && s.descriptionDisabled,
              ]}
              numberOfLines={2}
            >
              {description}
            </Text>
          )}
        </View>

        {/* Trailing content */}
        {renderTrailingContent()}
      </AnimatedPressable>

      {/* Divider */}
      {showDivider && (
        <View
          style={[
            s.divider,
            { marginLeft: getDividerInset() },
          ]}
        />
      )}
    </View>
  );
}

export default ListItem;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.component.md,
    paddingHorizontal: tokens.spacing.component.lg,
    minHeight: tokens.size.touchTarget.md,
  },
  containerSelected: {
    backgroundColor: colors.interactive.subtle,
  },
  leading: {
    marginRight: tokens.spacing.component.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    lineHeight: tokens.typography.fontSize.body * tokens.typography.lineHeight.ui,
    color: colors.text.primary,
  },
  titleDisabled: {
    color: colors.text.disabled,
  },
  titleSelected: {
    color: colors.interactive.primary,
  },
  subtitle: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.normal,
    lineHeight: tokens.typography.fontSize.bodySmall * tokens.typography.lineHeight.ui,
    marginTop: tokens.spacing.component.xs / 2,
    color: colors.text.secondary,
  },
  subtitleDisabled: {
    color: colors.text.disabled,
  },
  description: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.normal,
    lineHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.body,
    marginTop: tokens.spacing.component.xs,
    color: colors.text.tertiary,
  },
  descriptionDisabled: {
    color: colors.text.disabled,
  },
  trailing: {
    marginLeft: tokens.spacing.component.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.divider,
  },
  disabled: {
    opacity: tokens.opacity.disabled,
  },
  // Color values for dynamic styling
  pressedBg: {
    backgroundColor: colors.interactive.subtle,
  },
  iconDefault: {
    color: colors.text.secondary,
  },
  iconDisabled: {
    color: colors.text.disabled,
  },
  iconSelected: {
    color: colors.interactive.primary,
  },
  trailingIconDefault: {
    color: colors.text.tertiary,
  },
}));

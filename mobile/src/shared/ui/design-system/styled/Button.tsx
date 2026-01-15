/**
 * Button - Styled button component
 *
 * Combines the useButton headless hook with design tokens
 * to create a fully accessible, themed button component.
 *
 * @example
 * ```tsx
 * <Button variant="solid" colorScheme="primary" size="md">
 *   Click me
 * </Button>
 *
 * <Button
 *   variant="outline"
 *   colorScheme="danger"
 *   loading
 *   leadingIcon={<TrashIcon />}
 * >
 *   Delete
 * </Button>
 * ```
 */

import React from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
  type AccessibilityProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import { useButton, type UseButtonProps } from '../headless';
import { tokens } from '../tokens';
import { createStyles, useStyles } from '../theme';

// =============================================================================
// TYPES
// =============================================================================

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';
export type ButtonColorScheme = 'primary' | 'secondary' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends UseButtonProps {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Color scheme of the button */
  colorScheme?: ButtonColorScheme;
  /** Size of the button */
  size?: ButtonSize;
  /** Button content */
  children?: React.ReactNode;
  /** Icon to display before the label */
  leadingIcon?: React.ReactNode;
  /** Icon to display after the label */
  trailingIcon?: React.ReactNode;
  /** Whether the button takes full width */
  fullWidth?: boolean;
  /** Custom style for the button container */
  style?: ViewStyle;
  /** Custom style for the text */
  textStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

// =============================================================================
// ANIMATED PRESSABLE
// =============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// =============================================================================
// STYLE CONFIGURATIONS
// =============================================================================

/**
 * Size configurations
 */
const sizeConfigs: Record<
  ButtonSize,
  {
    paddingHorizontal: number;
    paddingVertical: number;
    fontSize: number;
    iconSize: number;
    minHeight: number;
    gap: number;
  }
> = {
  sm: {
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.xs,
    fontSize: tokens.typography.fontSize.bodySmall,
    iconSize: tokens.size.icon.xs,
    minHeight: tokens.size.touchTarget.sm,
    gap: tokens.spacing.component.xs,
  },
  md: {
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.sm,
    fontSize: tokens.typography.fontSize.body,
    iconSize: tokens.size.icon.sm,
    minHeight: tokens.size.touchTarget.md,
    gap: tokens.spacing.component.sm,
  },
  lg: {
    paddingHorizontal: tokens.spacing.component.xl,
    paddingVertical: tokens.spacing.component.md,
    fontSize: tokens.typography.fontSize.bodyLarge,
    iconSize: tokens.size.icon.md,
    minHeight: tokens.size.touchTarget.lg,
    gap: tokens.spacing.component.sm,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function Button({
  variant = 'solid',
  colorScheme = 'primary',
  size = 'md',
  children,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  style,
  textStyle,
  testID,
  ...hookProps
}: ButtonProps) {
  const s = useStyles(styles);
  const { buttonProps, state } = useButton(hookProps);
  const { isDisabled, isLoading, isPressed } = state;

  // Animation value for press feedback
  const scale = useSharedValue(1);

  // Get color scheme colors from resolved styles
  const getColorSchemeColors = () => {
    switch (colorScheme) {
      case 'primary':
        return {
          bg: s.interactivePrimary.backgroundColor,
          bgHover: s.interactivePrimaryHover.backgroundColor,
          bgActive: s.interactivePrimaryActive.backgroundColor,
          text: s.textInverse.color,
          border: s.interactivePrimary.backgroundColor,
        };
      case 'secondary':
        return {
          bg: s.interactiveSecondary.backgroundColor,
          bgHover: s.interactiveSecondaryHover.backgroundColor,
          bgActive: s.interactiveSecondaryActive.backgroundColor,
          text: s.textInverse.color,
          border: s.interactiveSecondary.backgroundColor,
        };
      case 'danger':
        return {
          bg: s.statusError.backgroundColor,
          bgHover: s.statusError.backgroundColor,
          bgActive: s.statusError.backgroundColor,
          text: s.textInverse.color,
          border: s.statusError.backgroundColor,
        };
      case 'success':
        return {
          bg: s.statusSuccess.backgroundColor,
          bgHover: s.statusSuccess.backgroundColor,
          bgActive: s.statusSuccess.backgroundColor,
          text: s.textInverse.color,
          border: s.statusSuccess.backgroundColor,
        };
      default:
        return {
          bg: s.interactivePrimary.backgroundColor,
          bgHover: s.interactivePrimaryHover.backgroundColor,
          bgActive: s.interactivePrimaryActive.backgroundColor,
          text: s.textInverse.color,
          border: s.interactivePrimary.backgroundColor,
        };
    }
  };

  const schemeColors = getColorSchemeColors();

  // Get variant-specific styles
  const getVariantStyles = (): {
    container: ViewStyle;
    text: TextStyle;
    pressedContainer: ViewStyle;
  } => {
    switch (variant) {
      case 'solid':
        return {
          container: {
            backgroundColor: schemeColors.bg,
            borderWidth: 0,
          },
          text: {
            color: schemeColors.text,
          },
          pressedContainer: {
            backgroundColor: schemeColors.bgActive,
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: tokens.borderWidth.default,
            borderColor: schemeColors.border,
          },
          text: {
            color: schemeColors.bg,
          },
          pressedContainer: {
            backgroundColor: s.interactiveSubtle.backgroundColor,
          },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 0,
          },
          text: {
            color: schemeColors.bg,
          },
          pressedContainer: {
            backgroundColor: s.interactiveSubtle.backgroundColor,
          },
        };
      case 'link':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 0,
            paddingHorizontal: 0,
            paddingVertical: 0,
            minHeight: undefined,
          },
          text: {
            color: s.textLink.color,
            textDecorationLine: 'underline',
          },
          pressedContainer: {
            opacity: tokens.opacity.pressed,
          },
        };
      default:
        return {
          container: {},
          text: {},
          pressedContainer: {},
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeConfig = sizeConfigs[size];

  // Animated scale style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Handle press in/out for animation
  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: tokens.duration.fast });
    buttonProps.onPressIn();
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: tokens.duration.fast });
    buttonProps.onPressOut();
  };

  // Icon color
  const iconColor = variantStyles.text.color as string;

  // Render icon with proper sizing
  const renderIcon = (icon: React.ReactNode) => {
    if (!icon) return null;
    return (
      <View style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ color?: string; size?: number }>, {
              color: iconColor,
              size: sizeConfig.iconSize,
            })
          : icon}
      </View>
    );
  };

  // Destructure tabIndex and onKeyDown from buttonProps as they're web-only
  const { tabIndex, onKeyDown, ...pressableProps } = buttonProps;

  return (
    <AnimatedPressable
      {...pressableProps}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={testID}
      style={({ pressed }) => [
        s.base,
        {
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          minHeight: variant === 'link' ? undefined : sizeConfig.minHeight,
          gap: sizeConfig.gap,
        },
        variantStyles.container,
        pressed && variantStyles.pressedContainer,
        isDisabled && s.disabled,
        fullWidth && s.fullWidth,
        animatedStyle,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.text.color as string}
          accessibilityLabel="Loading"
        />
      ) : (
        <>
          {renderIcon(leadingIcon)}
          {typeof children === 'string' ? (
            <Text
              style={[
                s.text,
                {
                  fontSize: sizeConfig.fontSize,
                  fontWeight: tokens.typography.fontWeight.semibold,
                  lineHeight: sizeConfig.fontSize * tokens.typography.lineHeight.ui,
                },
                variantStyles.text,
                isDisabled && s.disabledText,
                textStyle,
              ]}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {renderIcon(trailingIcon)}
        </>
      )}
    </AnimatedPressable>
  );
}

export default Button;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
  },
  text: {
    textAlign: 'center',
  },
  disabled: {
    opacity: tokens.opacity.disabled,
  },
  disabledText: {
    // Color is already handled by opacity
  },
  fullWidth: {
    width: '100%',
  },
  // Theme-dependent colors for use in dynamic styling
  interactivePrimary: {
    backgroundColor: colors.interactive.primary,
  },
  interactivePrimaryHover: {
    backgroundColor: colors.interactive.primaryHover,
  },
  interactivePrimaryActive: {
    backgroundColor: colors.interactive.primaryActive,
  },
  interactiveSecondary: {
    backgroundColor: colors.interactive.secondary,
  },
  interactiveSecondaryHover: {
    backgroundColor: colors.interactive.secondaryHover,
  },
  interactiveSecondaryActive: {
    backgroundColor: colors.interactive.secondaryActive,
  },
  interactiveSubtle: {
    backgroundColor: colors.interactive.subtle,
  },
  textInverse: {
    color: colors.text.inverse,
  },
  textLink: {
    color: colors.text.link,
  },
  statusError: {
    backgroundColor: colors.status.error,
  },
  statusSuccess: {
    backgroundColor: colors.status.success,
  },
}));

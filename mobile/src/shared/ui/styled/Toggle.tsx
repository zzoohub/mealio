/**
 * Toggle - Styled toggle/switch component
 *
 * Combines the useToggle headless hook with design tokens
 * to create a fully accessible, themed toggle component with smooth animations.
 *
 * @example
 * ```tsx
 * <Toggle
 *   label="Enable notifications"
 *   checked={isEnabled}
 *   onChange={setIsEnabled}
 * />
 *
 * <Toggle
 *   label="Dark mode"
 *   size="lg"
 *   colorScheme="secondary"
 * />
 * ```
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { useToggle, type UseToggleProps } from '../headless';
import { tokens } from '../tokens';
import { createStyles, useStyles } from '../theme';

// =============================================================================
// TYPES
// =============================================================================

export type ToggleSize = 'sm' | 'md' | 'lg';
export type ToggleColorScheme = 'primary' | 'secondary' | 'success';

export interface ToggleProps extends UseToggleProps {
  /** Label text displayed next to the toggle */
  label?: string;
  /** Size of the toggle */
  size?: ToggleSize;
  /** Color scheme when active */
  colorScheme?: ToggleColorScheme;
  /** Position of the label */
  labelPosition?: 'left' | 'right';
  /** Custom style for the container */
  style?: ViewStyle;
  /** Custom style for the label */
  labelStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

// =============================================================================
// SIZE CONFIGURATIONS
// =============================================================================

const sizeConfigs: Record<
  ToggleSize,
  {
    trackWidth: number;
    trackHeight: number;
    thumbSize: number;
    thumbMargin: number;
  }
> = {
  sm: {
    trackWidth: 40,
    trackHeight: 24,
    thumbSize: 18,
    thumbMargin: 3,
  },
  md: {
    trackWidth: 52,
    trackHeight: 32,
    thumbSize: 26,
    thumbMargin: 3,
  },
  lg: {
    trackWidth: 64,
    trackHeight: 38,
    thumbSize: 32,
    thumbMargin: 3,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function Toggle({
  label,
  size = 'md',
  colorScheme = 'primary',
  labelPosition = 'left',
  style,
  labelStyle,
  testID,
  ...hookProps
}: ToggleProps) {
  const s = useStyles(styles);
  const { toggleProps, labelProps, state, toggle } = useToggle(hookProps);
  const { isChecked, isDisabled, isPressed } = state;

  // Destructure web-only props from toggleProps
  const { tabIndex, onKeyDown, ...pressableToggleProps } = toggleProps;

  // Size configuration
  const sizeConfig = sizeConfigs[size];
  const thumbTravel = sizeConfig.trackWidth - sizeConfig.thumbSize - sizeConfig.thumbMargin * 2;

  // Animated values
  const progress = useSharedValue(isChecked ? 1 : 0);

  // Update animation when checked state changes
  React.useEffect(() => {
    progress.value = withSpring(isChecked ? 1 : 0, {
      damping: 15,
      stiffness: 120,
      mass: 1,
    });
  }, [isChecked, progress]);

  // Get active color based on color scheme
  const getActiveColor = () => {
    switch (colorScheme) {
      case 'primary':
        return s.primaryActive.backgroundColor as string;
      case 'secondary':
        return s.secondaryActive.backgroundColor as string;
      case 'success':
        return s.successActive.backgroundColor as string;
      default:
        return s.primaryActive.backgroundColor as string;
    }
  };

  const activeColor = getActiveColor();
  const inactiveColor = s.inactiveTrack.backgroundColor as string;

  // Animated track style
  const animatedTrackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, activeColor]
    );

    return {
      backgroundColor,
    };
  });

  // Animated thumb style
  const animatedThumbStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [0, thumbTravel]
    );

    const scale = isPressed ? 0.95 : 1;

    return {
      transform: [
        { translateX },
        { scale: withTiming(scale, { duration: tokens.duration.fast }) },
      ],
    };
  });

  // Handle press with haptic feedback potential
  const handlePress = () => {
    toggle();
  };

  return (
    <View
      style={[
        s.container,
        labelPosition === 'right' && s.containerReverse,
        style,
      ]}
      testID={testID}
    >
      {/* Label */}
      {label && (
        <Pressable
          {...labelProps}
          style={[
            s.labelContainer,
            labelPosition === 'right' && s.labelContainerRight,
          ]}
        >
          <Text
            style={[
              s.label,
              isDisabled && s.labelDisabled,
              labelStyle,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      )}

      {/* Toggle track */}
      <Pressable
        {...pressableToggleProps}
        onPress={handlePress}
        style={[
          s.touchArea,
          {
            width: sizeConfig.trackWidth + tokens.spacing.component.sm * 2,
            height: Math.max(sizeConfig.trackHeight + tokens.spacing.component.sm * 2, tokens.size.touchTarget.md),
          },
        ]}
      >
        <Animated.View
          style={[
            s.track,
            {
              width: sizeConfig.trackWidth,
              height: sizeConfig.trackHeight,
              borderRadius: sizeConfig.trackHeight / 2,
            },
            animatedTrackStyle,
            isDisabled && s.trackDisabled,
          ]}
        >
          {/* Thumb */}
          <Animated.View
            style={[
              s.thumb,
              {
                width: sizeConfig.thumbSize,
                height: sizeConfig.thumbSize,
                borderRadius: sizeConfig.thumbSize / 2,
                left: sizeConfig.thumbMargin,
                top: sizeConfig.thumbMargin,
              },
              animatedThumbStyle,
            ]}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export default Toggle;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors, { elevation }) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerReverse: {
    flexDirection: 'row-reverse',
  },
  labelContainer: {
    marginRight: tokens.spacing.component.md,
  },
  labelContainerRight: {
    marginRight: 0,
    marginLeft: tokens.spacing.component.md,
  },
  label: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    lineHeight: tokens.typography.fontSize.body * tokens.typography.lineHeight.ui,
    color: colors.text.primary,
  },
  labelDisabled: {
    color: colors.text.disabled,
  },
  touchArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    justifyContent: 'center',
  },
  trackDisabled: {
    opacity: tokens.opacity.disabled,
  },
  thumb: {
    position: 'absolute',
    backgroundColor: colors.bg.primary,
    ...elevation.raised,
  },
  // Color values for animations
  inactiveTrack: {
    backgroundColor: colors.bg.tertiary,
  },
  primaryActive: {
    backgroundColor: colors.interactive.primary,
  },
  secondaryActive: {
    backgroundColor: colors.interactive.secondary,
  },
  successActive: {
    backgroundColor: colors.status.success,
  },
}));

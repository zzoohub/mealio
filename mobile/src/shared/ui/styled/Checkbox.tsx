/**
 * Checkbox - Styled checkbox component
 *
 * Combines the useCheckbox headless hook with design tokens
 * to create a fully accessible, themed checkbox component with smooth animations.
 *
 * @example
 * ```tsx
 * <Checkbox
 *   label="I agree to the terms"
 *   checked={isAgreed}
 *   onChange={setIsAgreed}
 * />
 *
 * <Checkbox
 *   label="Select all"
 *   indeterminate={someSelected && !allSelected}
 *   checked={allSelected}
 *   onChange={handleSelectAll}
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
  useAnimatedProps,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  interpolateColor,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path, Line } from 'react-native-svg';
import { useCheckbox, type UseCheckboxProps } from '../headless';
import { tokens } from '../tokens';
import { createStyles, useStyles } from '../theme';

// =============================================================================
// TYPES
// =============================================================================

export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxColorScheme = 'primary' | 'secondary' | 'success';

export interface CheckboxProps extends UseCheckboxProps {
  /** Label text displayed next to the checkbox */
  label?: string;
  /** Size of the checkbox */
  size?: CheckboxSize;
  /** Color scheme when checked */
  colorScheme?: CheckboxColorScheme;
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
  CheckboxSize,
  {
    boxSize: number;
    iconSize: number;
    strokeWidth: number;
  }
> = {
  sm: {
    boxSize: 18,
    iconSize: 12,
    strokeWidth: 2,
  },
  md: {
    boxSize: 24,
    iconSize: 16,
    strokeWidth: 2.5,
  },
  lg: {
    boxSize: 30,
    iconSize: 20,
    strokeWidth: 3,
  },
};

// =============================================================================
// ANIMATED SVG COMPONENTS
// =============================================================================

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);

// =============================================================================
// CHECK ICON
// =============================================================================

interface CheckIconProps {
  size: number;
  strokeWidth: number;
  color: string;
  progress: SharedValue<number>;
}

function CheckIcon({ size, strokeWidth, color, progress }: CheckIconProps) {
  const pathLength = size * 1.5; // Approximate path length

  const animatedProps = useAnimatedProps(() => {
    const dashOffset = interpolate(progress.value, [0, 1], [pathLength, 0]);
    return {
      strokeDashoffset: dashOffset,
    };
  });

  // Check path: Start from left, go down, then up to right
  const d = `M${size * 0.15} ${size * 0.5} L${size * 0.4} ${size * 0.75} L${size * 0.85} ${size * 0.25}`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <AnimatedPath
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={pathLength}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

// =============================================================================
// INDETERMINATE ICON
// =============================================================================

interface IndeterminateIconProps {
  size: number;
  strokeWidth: number;
  color: string;
  progress: SharedValue<number>;
}

function IndeterminateIcon({ size, strokeWidth, color, progress }: IndeterminateIconProps) {
  const padding = size * 0.2;

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [0, 1]);

    return {
      transform: [{ scale }],
      opacity: progress.value,
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Line
          x1={padding}
          y1={size / 2}
          x2={size - padding}
          y2={size / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Checkbox({
  label,
  size = 'md',
  colorScheme = 'primary',
  style,
  labelStyle,
  testID,
  ...hookProps
}: CheckboxProps) {
  const s = useStyles(styles);
  const { checkboxProps, labelProps, state, toggle } = useCheckbox(hookProps);
  const { isChecked, isIndeterminate, isDisabled, isPressed, isFocused } = state;

  // Destructure web-only props from checkboxProps
  const { tabIndex, onKeyDown, ...pressableCheckboxProps } = checkboxProps;

  // Size configuration
  const sizeConfig = sizeConfigs[size];

  // Animated values
  const checkProgress = useSharedValue(isChecked ? 1 : 0);
  const indeterminateProgress = useSharedValue(isIndeterminate ? 1 : 0);
  const boxScale = useSharedValue(1);

  // Update animations when state changes
  React.useEffect(() => {
    checkProgress.value = withSpring(isChecked && !isIndeterminate ? 1 : 0, {
      damping: 12,
      stiffness: 150,
    });
    indeterminateProgress.value = withSpring(isIndeterminate ? 1 : 0, {
      damping: 12,
      stiffness: 150,
    });
  }, [isChecked, isIndeterminate, checkProgress, indeterminateProgress]);

  // Press animation
  React.useEffect(() => {
    boxScale.value = withTiming(isPressed ? 0.9 : 1, {
      duration: tokens.duration.fast,
      easing: Easing.out(Easing.quad),
    });
  }, [isPressed, boxScale]);

  // Get active color based on color scheme
  const getActiveStyles = () => {
    switch (colorScheme) {
      case 'primary':
        return s.primaryActive;
      case 'secondary':
        return s.secondaryActive;
      case 'success':
        return s.successActive;
      default:
        return s.primaryActive;
    }
  };

  const activeStyles = getActiveStyles();
  const isActive = isChecked || isIndeterminate;

  // Animated box style
  const animatedBoxStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      isActive ? 1 : 0,
      [0, 1],
      ['transparent', activeStyles.backgroundColor as string]
    );

    const borderColor = interpolateColor(
      isActive ? 1 : 0,
      [0, 1],
      [s.borderDefault.borderColor as string, activeStyles.borderColor as string]
    );

    return {
      backgroundColor,
      borderColor,
      transform: [{ scale: boxScale.value }],
    };
  });

  // Focus ring style
  const focusRingStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0, { duration: tokens.duration.fast }),
    };
  });

  return (
    <Pressable
      {...pressableCheckboxProps}
      onPress={toggle}
      style={[s.container, style]}
      testID={testID}
    >
      {/* Focus ring */}
      <Animated.View
        style={[
          s.focusRing,
          {
            width: sizeConfig.boxSize + 8,
            height: sizeConfig.boxSize + 8,
            borderRadius: tokens.radius.sm + 2,
          },
          focusRingStyle,
        ]}
      />

      {/* Checkbox box */}
      <Animated.View
        style={[
          s.box,
          {
            width: sizeConfig.boxSize,
            height: sizeConfig.boxSize,
          },
          animatedBoxStyle,
          isDisabled && s.boxDisabled,
        ]}
      >
        {/* Check icon */}
        {isChecked && !isIndeterminate && (
          <CheckIcon
            size={sizeConfig.iconSize}
            strokeWidth={sizeConfig.strokeWidth}
            color={s.textInverse.color as string}
            progress={checkProgress}
          />
        )}

        {/* Indeterminate icon */}
        {isIndeterminate && (
          <IndeterminateIcon
            size={sizeConfig.iconSize}
            strokeWidth={sizeConfig.strokeWidth}
            color={s.textInverse.color as string}
            progress={indeterminateProgress}
          />
        )}
      </Animated.View>

      {/* Label */}
      {label && (
        <Text
          {...labelProps}
          style={[
            s.label,
            isDisabled && s.labelDisabled,
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export default Checkbox;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.size.touchTarget.md,
  },
  focusRing: {
    position: 'absolute',
    left: -4,
    borderWidth: 2,
    borderColor: colors.border.focus,
  },
  box: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: tokens.borderWidth.thick,
    borderRadius: tokens.radius.sm,
  },
  boxDisabled: {
    opacity: tokens.opacity.disabled,
  },
  label: {
    marginLeft: tokens.spacing.component.sm,
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    lineHeight: tokens.typography.fontSize.body * tokens.typography.lineHeight.ui,
    flex: 1,
    color: colors.text.primary,
  },
  labelDisabled: {
    color: colors.text.disabled,
  },
  // Color values for animations
  borderDefault: {
    borderColor: colors.border.default,
  },
  primaryActive: {
    backgroundColor: colors.interactive.primary,
    borderColor: colors.interactive.primary,
  },
  secondaryActive: {
    backgroundColor: colors.interactive.secondary,
    borderColor: colors.interactive.secondary,
  },
  successActive: {
    backgroundColor: colors.status.success,
    borderColor: colors.status.success,
  },
  textInverse: {
    color: colors.text.inverse,
  },
}));

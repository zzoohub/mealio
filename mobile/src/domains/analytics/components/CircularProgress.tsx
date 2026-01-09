/**
 * CircularProgress - Animated circular progress indicator
 *
 * A reusable circular progress component that displays progress
 * as an animated ring with customizable size, colors, and content.
 *
 * @example
 * ```tsx
 * <CircularProgress
 *   size={80}
 *   strokeWidth={6}
 *   progress={75}
 *   color={theme.colors.interactive.primary}
 * >
 *   <Text>75%</Text>
 * </CircularProgress>
 * ```
 */

import React from "react";
import { View, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { createStyles, useStyles } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

interface CircularProgressProps {
  /** Size of the component (width and height) */
  size: number;
  /** Width of the progress stroke */
  strokeWidth: number;
  /** Progress value from 0-100 */
  progress: number;
  /** Color of the progress stroke */
  color: string;
  /** Background color of the track (defaults to theme border color) */
  backgroundColor?: string;
  /** Content to display in the center */
  children?: React.ReactNode;
  /** Additional styles for the container */
  style?: ViewStyle;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CircularProgress({
  size,
  strokeWidth,
  progress,
  color,
  backgroundColor,
  children,
  style,
}: CircularProgressProps) {
  const s = useStyles(styles);

  // Use theme-aware default background color
  const defaultBackgroundColor =
    backgroundColor || s.trackLight.color;

  // Calculate circle dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {/* Background Circle (Track) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={defaultBackgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {children && (
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}

export default CircularProgress;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors, { isDark }) => ({
  trackLight: {
    color: colors.border.default,
  },
  trackDark: {
    color: colors.border.subtle,
  },
}));

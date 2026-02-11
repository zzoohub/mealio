import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { createStyles, useStyles } from "@/shared/ui/theme";

// =============================================================================
// TYPES
// =============================================================================

export interface CaptureButtonProps {
  onCapture: () => void;
  isCapturing: boolean;
  /** Shared value for external animation control (0 = not pressed, 1 = pressed) */
  pressedState?: SharedValue<number>;
  disabled?: boolean;
  /** Bottom safe area inset from parent (accounts for home indicator) */
  bottomInset?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CaptureButton = memo(function CaptureButton({
  onCapture,
  isCapturing,
  pressedState,
  disabled,
  bottomInset = 0,
}: CaptureButtonProps) {
  const s = useStyles(captureButtonStyles);

  // Internal pressed state if not provided externally
  const internalPressed = useSharedValue(0);
  const pressed = pressedState ?? internalPressed;

  // Gesture handler for tap with animated press states
  const tap = Gesture.Tap()
    .enabled(!disabled && !isCapturing)
    .onBegin(() => {
      pressed.set(withTiming(1, { duration: 100 }));
    })
    .onFinalize(() => {
      pressed.set(withTiming(0, { duration: 100 }));
    })
    .onEnd(() => {
      runOnJS(onCapture)();
    });

  // Derive scale from pressed state
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.get(), [0, 1], [1, 0.85]);
    return {
      transform: [{ scale }],
    };
  });

  const captureAreaPosition = useMemo(() => ({
    bottom: Math.max(bottomInset, 16) + CAPTURE_BUTTON_BOTTOM_OFFSET,
  }), [bottomInset]);

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[styles.captureArea, captureAreaPosition, animatedStyle]}>
        <View style={styles.captureButton}>
          <View style={[styles.captureRing, isCapturing && s.capturingRing]}>
            <View style={[styles.captureInner, isCapturing && s.capturingInner]} />
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const CAPTURE_BUTTON_SIZE = 80;
const CAPTURE_BUTTON_BOTTOM_OFFSET = 80;

const styles = StyleSheet.create({
  captureArea: {
    position: "absolute",
    alignSelf: "center",
    left: "50%",
    marginLeft: -(CAPTURE_BUTTON_SIZE / 2),
  },
  captureButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  captureRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
});

const captureButtonStyles = createStyles((colors) => ({
  capturingRing: {
    borderColor: colors.interactive.primary,
  },
  capturingInner: {
    backgroundColor: colors.interactive.primary,
  },
}));

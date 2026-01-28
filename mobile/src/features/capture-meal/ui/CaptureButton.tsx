import React from "react";
import { View, Pressable, Animated, StyleSheet } from "react-native";
import { createStyles, useStyles } from "@/shared/ui/theme";

// =============================================================================
// TYPES
// =============================================================================

export interface CaptureButtonProps {
  onCapture: () => void;
  isCapturing: boolean;
  scaleValue: Animated.Value;
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CaptureButton({ onCapture, isCapturing, scaleValue, disabled }: CaptureButtonProps) {
  const s = useStyles(captureButtonStyles);

  return (
    <Pressable
      style={styles.captureArea}
      onPress={onCapture}
      disabled={disabled || isCapturing}
    >
      <Animated.View style={[styles.captureButton, { transform: [{ scale: scaleValue }] }]}>
        <View style={[styles.captureRing, isCapturing && s.capturingRing]}>
          <View style={[styles.captureInner, isCapturing && s.capturingInner]} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  captureArea: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    left: "50%",
    marginLeft: -40,
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

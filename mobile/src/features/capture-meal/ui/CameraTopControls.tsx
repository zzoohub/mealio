import React, { memo, useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { iconSizes, tokens } from "@/shared/ui/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface CameraTopControlsProps {
  flashIcon: "flash" | "flash-outline" | "flash-off";
  onToggleFlash: () => void;
  onSettingsPress: () => void;
  /** Top safe area inset from parent (accounts for notch/Dynamic Island) */
  topInset: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CameraTopControls = memo(function CameraTopControls({ flashIcon, onToggleFlash, onSettingsPress, topInset }: CameraTopControlsProps) {
  const dynamicStyle = useMemo(() => ({
    paddingTop: topInset + tokens.spacing.component.sm,
  }), [topInset]);

  return (
    <View style={[styles.topControls, dynamicStyle]}>
      <Pressable
        style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
        onPress={onSettingsPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Ionicons name="settings-outline" size={iconSizes.md} color="white" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
        onPress={onToggleFlash}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Toggle flash"
      >
        <Ionicons name={flashIcon} size={iconSizes.md} color="white" />
      </Pressable>
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.component.lg,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  controlButton: {
    width: tokens.size.touchTarget.md,
    height: tokens.size.touchTarget.md,
    borderRadius: tokens.size.touchTarget.md / 2,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonPressed: {
    opacity: 0.6,
  },
});

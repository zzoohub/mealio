import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { iconSizes } from "@/shared/ui/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface CameraTopControlsProps {
  flashIcon: "flash" | "flash-outline" | "flash-off";
  onToggleFlash: () => void;
  onSettingsPress: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CameraTopControls({ flashIcon, onToggleFlash, onSettingsPress }: CameraTopControlsProps) {
  return (
    <View style={styles.topControls}>
      <TouchableOpacity style={styles.controlButton} onPress={onSettingsPress}>
        <Ionicons name="settings-outline" size={iconSizes.md} color="white" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.controlButton} onPress={onToggleFlash}>
        <Ionicons name={flashIcon} size={iconSizes.md} color="white" />
      </TouchableOpacity>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { iconSizes } from "@/shared/ui/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface CameraBottomControlsProps {
  onDiaryPress: () => void;
  onGalleryPress: () => void;
  diaryLabel: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CameraBottomControls({ onDiaryPress, onGalleryPress, diaryLabel }: CameraBottomControlsProps) {
  return (
    <View style={styles.bottomControls}>
      <TouchableOpacity style={styles.bottomButton} onPress={onDiaryPress}>
        <Ionicons name="book-outline" size={iconSizes.md} color="white" />
        <Text style={styles.bottomButtonText}>{diaryLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomButton} onPress={onGalleryPress}>
        <Ionicons name="images-outline" size={iconSizes.md} color="white" />
      </TouchableOpacity>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  bottomControls: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomButton: {
    alignItems: "center",
    padding: 8,
    position: "relative",
  },
  bottomButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
});

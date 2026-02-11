import React, { memo, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { iconSizes, tokens } from "@/shared/ui/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface CameraBottomControlsProps {
  onDiaryPress: () => void;
  onGalleryPress: () => void;
  diaryLabel: string;
  /** Bottom safe area inset from parent (accounts for home indicator) */
  bottomInset: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CameraBottomControls = memo(function CameraBottomControls({ onDiaryPress, onGalleryPress, diaryLabel, bottomInset }: CameraBottomControlsProps) {
  const dynamicStyle = useMemo(() => ({
    bottom: Math.max(bottomInset, 16) + tokens.spacing.component.lg,
  }), [bottomInset]);

  return (
    <View style={[styles.bottomControls, dynamicStyle]}>
      <Pressable style={styles.bottomButton} onPress={onDiaryPress}>
        <Ionicons name="book-outline" size={iconSizes.md} color="white" />
        <Text style={styles.bottomButtonText}>{diaryLabel}</Text>
      </Pressable>

      <Pressable style={styles.bottomButton} onPress={onGalleryPress}>
        <Ionicons name="images-outline" size={iconSizes.md} color="white" />
      </Pressable>
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  bottomControls: {
    position: "absolute",
    left: tokens.spacing.component.lg,
    right: tokens.spacing.component.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomButton: {
    alignItems: "center",
    padding: tokens.spacing.component.sm,
    position: "relative",
  },
  bottomButtonText: {
    color: "white",
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
    marginTop: tokens.spacing.component.xs,
  },
});

import React from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles } from "@/shared/ui/theme";
import { tokens } from "@/shared/ui/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface CameraPermissionScreenProps {
  onRequestPermission: () => void;
  /** When true, permission was denied and user must open Settings instead */
  isDenied?: boolean;
  labels: {
    title: string;
    message: string;
    buttonText: string;
    openSettingsText?: string;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CameraPermissionScreen({
  onRequestPermission,
  isDenied = false,
  labels,
}: CameraPermissionScreenProps) {
  const s = useStyles(permissionStyles);

  const handlePress = () => {
    if (isDenied) {
      Linking.openSettings();
    } else {
      onRequestPermission();
    }
  };

  const buttonLabel = isDenied && labels.openSettingsText
    ? labels.openSettingsText
    : labels.buttonText;

  return (
    <View style={[styles.container, s.container]}>
      <Ionicons name="camera-outline" size={80} color={s.icon.color} />
      <Text style={[styles.title, s.title]}>{labels.title}</Text>
      <Text style={[styles.message, s.message]}>{labels.message}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          s.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={handlePress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.layout.lg,
  },
  title: {
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.bold,
    marginTop: tokens.spacing.layout.sm,
    marginBottom: tokens.spacing.component.lg,
    textAlign: "center",
  },
  message: {
    fontSize: tokens.typography.fontSize.body,
    textAlign: "center",
    lineHeight: tokens.typography.fontSize.body * tokens.typography.lineHeight.body,
    marginBottom: tokens.spacing.layout.md,
  },
  button: {
    paddingHorizontal: tokens.spacing.layout.md,
    paddingVertical: tokens.spacing.component.lg,
    borderRadius: tokens.radius.md,
    minHeight: tokens.size.touchTarget.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});

const permissionStyles = createStyles((colors) => ({
  container: {
    backgroundColor: colors.bg.primary,
  },
  icon: {
    color: colors.interactive.primary,
  },
  title: {
    color: colors.text.primary,
  },
  message: {
    color: colors.text.secondary,
  },
  button: {
    backgroundColor: colors.interactive.primary,
  },
}));

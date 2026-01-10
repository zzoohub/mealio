import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles } from "@/design-system/theme";
import { tokens, iconSizes } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface CameraPermissionScreenProps {
  onRequestPermission: () => void;
  labels: {
    title: string;
    message: string;
    buttonText: string;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CameraPermissionScreen({ onRequestPermission, labels }: CameraPermissionScreenProps) {
  const s = useStyles(permissionStyles);

  return (
    <View style={[styles.container, s.container]}>
      <Ionicons name="camera-outline" size={80} color={s.icon.color} />
      <Text style={[styles.title, s.title]}>{labels.title}</Text>
      <Text style={[styles.message, s.message]}>{labels.message}</Text>
      <TouchableOpacity style={[styles.button, s.button]} onPress={onRequestPermission}>
        <Text style={styles.buttonText}>{labels.buttonText}</Text>
      </TouchableOpacity>
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
    lineHeight: tokens.typography.lineHeight.body,
    marginBottom: tokens.spacing.layout.md,
  },
  button: {
    paddingHorizontal: tokens.spacing.layout.md,
    paddingVertical: tokens.spacing.component.lg,
    borderRadius: tokens.radius.md,
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

export default CameraPermissionScreen;

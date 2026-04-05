import React from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles } from "@/shared/ui/theme";
import { tokens } from "@/shared/ui/tokens";

// =============================================================================
// CONSTANTS
// =============================================================================

const ICON_SIZE = 80;
const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

// =============================================================================
// TYPES
// =============================================================================

export interface CameraPermissionScreenProps {
  onRequestPermission: () => void;
  /** When true, permission was denied and canAskAgain is false */
  isDenied?: boolean;
  /** Called when the user taps the go-back button in the denied state */
  onGoBack?: () => void;
  labels: {
    title: string;
    message: string;
    buttonText: string;
    openSettingsText?: string;
    goBackText?: string;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CameraPermissionScreen({
  onRequestPermission,
  isDenied = false,
  onGoBack,
  labels,
}: CameraPermissionScreenProps) {
  const s = useStyles(permissionStyles);

  const iconName = isDenied ? "camera-off-outline" : "camera-outline";
  const primaryLabel = isDenied ? labels.goBackText : labels.buttonText;
  const primaryAction = isDenied ? onGoBack : onRequestPermission;

  return (
    <View style={[styles.container, s.container]}>
      <Ionicons name={iconName} size={ICON_SIZE} color={s.icon.color} />
      <Text style={[styles.title, s.title]}>{labels.title}</Text>
      <Text style={[styles.message, s.message]}>{labels.message}</Text>

      {primaryLabel && primaryAction && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            s.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={primaryAction}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
        >
          <Text style={styles.buttonText}>{primaryLabel}</Text>
        </Pressable>
      )}

      {isDenied && labels.openSettingsText && (
        <Pressable
          style={({ pressed }) => [
            styles.settingsLink,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => Linking.openSettings()}
          hitSlop={HIT_SLOP}
          accessibilityRole="link"
          accessibilityLabel={labels.openSettingsText}
        >
          <Text style={[styles.settingsLinkText, s.settingsLinkText]}>
            {labels.openSettingsText}
          </Text>
        </Pressable>
      )}
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
  settingsLink: {
    marginTop: tokens.spacing.component.lg,
    padding: tokens.spacing.component.lg,
  },
  settingsLinkText: {
    fontSize: tokens.typography.fontSize.body,
    textDecorationLine: "underline" as const,
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
  settingsLinkText: {
    color: colors.text.secondary,
  },
}));

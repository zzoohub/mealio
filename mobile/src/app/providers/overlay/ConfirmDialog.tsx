import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/shared/ui/theme";
import * as Haptics from "expo-haptics";
import { useCommonI18n } from "@/shared/lib/i18n";

export interface ConfirmDialogProps {
  isOpen: boolean;
  close: () => void;
  exit: () => void;
  title: string;
  message?: string | undefined;
  confirmText?: string | undefined;
  cancelText?: string | undefined;
  confirmVariant?: "default" | "destructive" | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  close,
  exit,
  title,
  message,
  confirmText,
  cancelText,
  confirmVariant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, isDark } = useTheme();
  const common = useCommonI18n();
  const { width: screenWidth } = useWindowDimensions();
  const resolvedConfirmText = confirmText || common.confirm;
  const resolvedCancelText = cancelText || common.cancel;
  const backdropAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.9);

  useEffect(() => {
    if (isOpen) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      backdropAnim.value = withTiming(1, { duration: 200 });
      scaleAnim.value = withSpring(1, { damping: 10, stiffness: 100 });
    } else {
      backdropAnim.value = withTiming(0, { duration: 150 });
      scaleAnim.value = withTiming(0.9, { duration: 150 }, (finished) => {
        if (finished) {
          runOnJS(exit)();
        }
      });
    }
  }, [isOpen, exit, backdropAnim, scaleAnim]);

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm();
    close();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
    close();
  };

  const confirmButtonColor =
    confirmVariant === "destructive" ? colors.status.error : colors.interactive.primary;

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropAnim.value,
  }));

  const dialogStyle = useAnimatedStyle(() => ({
    opacity: backdropAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <View style={styles.container} pointerEvents={isOpen ? "auto" : "none"}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.backdropPressable} onPress={handleCancel} />
      </Animated.View>

      <Animated.View
        style={[
          styles.dialog,
          { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", maxWidth: Math.min(screenWidth * 0.8, 400) },
          dialogStyle,
        ]}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
          {message && (
            <Text style={[styles.message, { color: colors.text.secondary }]}>
              {message}
            </Text>
          )}
        </View>

        <View style={[styles.buttonContainer, { borderTopColor: colors.border.default }]}>
          <Pressable
            style={({ pressed }) => [styles.button, styles.cancelButton, { borderRightColor: colors.border.default }, pressed && styles.buttonPressed]}
            onPress={handleCancel}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: colors.interactive.primary }]}>
              {resolvedCancelText}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, styles.confirmButton, pressed && styles.buttonPressed]}
            onPress={handleConfirm}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, styles.confirmText, { color: confirmButtonColor }]}>
              {resolvedConfirmText}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdropPressable: {
    flex: 1,
  },
  dialog: {
    width: "80%",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  confirmButton: {},
  buttonPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  buttonText: {
    fontSize: 17,
  },
  confirmText: {
    fontWeight: "600",
  },
});

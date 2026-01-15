import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Pressable } from "react-native";
import { useTheme } from "@/shared/ui/theme";
import * as Haptics from "expo-haptics";

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
  confirmText = "확인",
  cancelText = "취소",
  confirmVariant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, isDark } = useTheme();
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (isOpen) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        exit();
      });
    }
  }, [isOpen, backdropAnim, scaleAnim, exit]);

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

  return (
    <View style={styles.container} pointerEvents={isOpen ? "auto" : "none"}>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={styles.backdropPressable} onPress={handleCancel} />
      </Animated.View>

      <Animated.View
        style={[
          styles.dialog,
          {
            backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
            opacity: backdropAnim,
            transform: [{ scale: scaleAnim }],
          },
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
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderRightColor: colors.border.default }]}
            onPress={handleCancel}
          >
            <Text style={[styles.buttonText, { color: colors.interactive.primary }]}>
              {cancelText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleConfirm}>
            <Text style={[styles.buttonText, styles.confirmText, { color: confirmButtonColor }]}>
              {confirmText}
            </Text>
          </TouchableOpacity>
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
    maxWidth: 320,
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
  buttonText: {
    fontSize: 17,
  },
  confirmText: {
    fontWeight: "600",
  },
});

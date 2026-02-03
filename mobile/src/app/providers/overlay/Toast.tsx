import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export type ToastType = "success" | "error" | "info" | "warning";
export type ToastPosition = "top" | "bottom";

export interface ToastProps {
  isOpen: boolean;
  close: () => void;
  exit: () => void;
  title: string;
  message?: string | undefined;
  type?: ToastType | undefined;
  position?: ToastPosition | undefined;
  duration?: number | undefined;
  showArrow?: boolean | undefined;
  onPress?: (() => void) | undefined;
}

const TOAST_COLORS: Record<ToastType, string> = {
  success: "#4CAF50",
  error: "#F44336",
  info: "#2196F3",
  warning: "#FF9800",
};

const TOAST_ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
  warning: "warning",
};

export function Toast({
  isOpen,
  close,
  exit,
  title,
  message,
  type = "info",
  position = "bottom",
  duration = 3000,
  showArrow = false,
  onPress,
}: ToastProps) {
  const animValue = useSharedValue(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isBottom = position === "bottom";

  useEffect(() => {
    if (isOpen) {
      // Haptic feedback
      if (type === "error") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (type === "success") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Animate in
      animValue.value = withSpring(1, { damping: 10, stiffness: 80 });

      // Auto dismiss
      timerRef.current = setTimeout(() => {
        close();
      }, duration);
    } else {
      // Animate out
      animValue.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(exit)();
        }
      });
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOpen, duration, type, close, exit, animValue]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    close();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animValue.value,
    transform: [
      {
        translateY: interpolate(
          animValue.value,
          [0, 1],
          [isBottom ? 100 : -100, 0],
        ),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        isBottom ? styles.bottomPosition : styles.topPosition,
        animatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.toast}
        onPress={handlePress}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={TOAST_ICONS[type]} size={24} color={TOAST_COLORS[type]} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  topPosition: {
    top: 100,
  },
  bottomPosition: {
    bottom: 120,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  message: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
    marginTop: 2,
  },
});

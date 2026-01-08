import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
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
  const animValue = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      Animated.spring(animValue, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();

      // Auto dismiss
      timerRef.current = setTimeout(() => {
        close();
      }, duration);
    } else {
      // Animate out
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        exit();
      });
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOpen, duration, type, animValue, close, exit]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    close();
  };

  const isBottom = position === "bottom";
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [isBottom ? 100 : -100, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        isBottom ? styles.bottomPosition : styles.topPosition,
        {
          opacity: animValue,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.toast}
        onPress={handlePress}
        activeOpacity={0.9}
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
      </TouchableOpacity>
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

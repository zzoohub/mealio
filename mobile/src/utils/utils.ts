import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { HAPTIC_TYPES } from "../constants";

const isIOS = Platform.OS === "ios";

// Haptic feedback utility
export const triggerHaptic = (type: keyof typeof HAPTIC_TYPES = "MEDIUM") => {
  if (!isIOS) return;

  try {
    switch (type) {
      case "LIGHT":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "MEDIUM":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "HEAVY":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "SUCCESS":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "WARNING":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "ERROR":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    console.warn("Haptic feedback failed:", error);
  }
};

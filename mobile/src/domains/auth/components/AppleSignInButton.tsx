import { Platform, View, ActivityIndicator, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles, useTheme } from "@/design-system/theme";
import { Text } from "@/design-system/styled";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

interface AppleSignInButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AppleSignInButton({
  onPress,
  isLoading = false,
  disabled = false,
  label = "Continue with Apple",
}: AppleSignInButtonProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setIsAvailable);
    }
  }, []);

  // Only show on iOS when available
  if (Platform.OS !== "ios" || !isAvailable) {
    return null;
  }

  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[s.button, isDisabled && s.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.text.primary} style={s.icon} />
      ) : (
        <View style={s.iconContainer}>
          <Ionicons name="logo-apple" size={20} color={colors.text.primary} />
        </View>
      )}
      <Text style={s.label}>{label}</Text>
      <View style={s.spacer} />
    </TouchableOpacity>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  button: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: tokens.spacing.component.md,
    paddingHorizontal: tokens.spacing.component.lg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    minHeight: 52,
    backgroundColor: colors.bg.primary,
    borderColor: colors.border.default,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 32,
  },
  icon: {
    width: 32,
  },
  label: {
    flex: 1,
    textAlign: "center" as const,
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.text.primary,
  },
  spacer: {
    width: 32,
  },
}));

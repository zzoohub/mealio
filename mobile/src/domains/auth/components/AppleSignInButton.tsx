import { Platform, View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { createStyles, useStyles, useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

interface AppleSignInButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AppleSignInButton({
  onPress,
  isLoading = false,
  disabled = false,
}: AppleSignInButtonProps) {
  const s = useStyles(styles);
  const { isDark } = useTheme();
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
    <View style={s.container}>
      {isLoading ? (
        <View style={[s.loadingOverlay, isDark ? s.loadingOverlayLight : s.loadingOverlayDark]}>
          <ActivityIndicator size="small" color={isDark ? "#000" : "#fff"} />
        </View>
      ) : null}
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={
          isDark
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={tokens.radius.lg}
        style={[s.button, isDisabled && s.buttonDisabled]}
        onPress={() => {
          if (!isDisabled) {
            onPress();
          }
        }}
      />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles(() => ({
  container: {
    position: "relative" as const,
  },
  button: {
    width: "100%" as unknown as number,
    height: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: tokens.radius.lg,
  },
  loadingOverlayDark: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  loadingOverlayLight: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
}));

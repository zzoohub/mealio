import { TouchableOpacity, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles, useTheme } from "@/shared/ui/theme";
import { Text } from "@/shared/ui/styled";
import { tokens } from "@/shared/ui/tokens";

// =============================================================================
// TYPES
// =============================================================================

interface GoogleSignInButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function GoogleSignInButton({
  onPress,
  isLoading = false,
  disabled = false,
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();

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
          <Ionicons name="logo-google" size={20} color="#4285F4" />
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
    padding: tokens.spacing.component.md,
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

import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { createStyles, useStyles } from "@/design-system/theme";
import { Box, Text, VStack, Button, Center } from "@/design-system/styled";
import { tokens } from "@/design-system/tokens";
import { VerificationInput } from "./VerificationInput";
import { useAuthStore } from "../stores/authStore";

interface VerificationScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function VerificationScreen({ onSuccess, onBack }: VerificationScreenProps) {
  const s = useStyles(styles);

  const {
    verifyCode,
    resendCode,
    pendingPhone,
    isVerifying,
    isLoading,
    error,
    resendCooldown,
    clearError,
  } = useAuthStore();

  const [code, setCode] = useState("");

  // Format phone number for display
  const formatPhoneForDisplay = (phone: string | null) => {
    if (!phone) return "";

    // Extract country code and number
    const match = phone.match(/^(\+\d{1,3})(.*)$/);
    if (!match) return phone;

    const [, countryCode, number] = match;

    // Format US/CA numbers
    if (countryCode === "+1" && number?.length === 10) {
      return `${countryCode} (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }

    // Format Korean numbers
    if (countryCode === "+82" && number) {
      if (number.length === 10) {
        return `${countryCode} ${number.slice(0, 2)}-${number.slice(2, 6)}-${number.slice(6)}`;
      } else if (number.length === 11) {
        return `${countryCode} ${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7)}`;
      }
    }

    // Format Japanese numbers
    if (countryCode === "+81" && number && number.length >= 10) {
      return `${countryCode} ${number.slice(0, 2)}-${number.slice(2, 6)}-${number.slice(6)}`;
    }

    // For other countries, add space after country code
    return `${countryCode} ${number ?? ""}`;
  };

  const handleCodeChange = (newCode: string) => {
    clearError();
    setCode(newCode);
  };

  const handleCodeComplete = async (completedCode: string) => {
    try {
      await verifyCode({ code: completedCode });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      onSuccess();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCode("");
    }
  };

  const handleResendCode = async () => {
    try {
      clearError();
      await resendCode();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Alert.alert("Code Sent", "A new verification code has been sent to your phone.");
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleWrongNumber = () => {
    Alert.alert(
      "Change Phone Number?",
      "This will take you back to enter a different phone number.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Change Number", onPress: onBack },
      ]
    );
  };

  const canResend = resendCooldown === 0 && !isLoading && !isVerifying;

  return (
    <Box style={s.container}>
      <KeyboardAvoidingView
        style={s.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.content}>
            {/* Header */}
            <VStack align="center" gap="sm" style={{ marginBottom: tokens.spacing.layout.xl }}>
              <Text variant="h2" align="center">
                Check your texts
              </Text>
              <Text variant="body" color="secondary" align="center">
                We sent a verification code to:
              </Text>
              <Text variant="bodyLarge" weight="semibold" align="center">
                {formatPhoneForDisplay(pendingPhone)}
              </Text>
            </VStack>

            {/* Verification Input */}
            <Box mb="xl">
              <VerificationInput
                value={code}
                onChangeText={handleCodeChange}
                onComplete={handleCodeComplete}
                error={error || undefined}
                disabled={isVerifying || isLoading}
                autoFocus
              />
            </Box>

            {/* Resend Section */}
            <VStack align="center" gap="sm" style={{ marginBottom: tokens.spacing.layout.lg }}>
              <Text variant="bodySmall" color="secondary">
                Didn't get it?
              </Text>

              {canResend ? (
                <Pressable onPress={handleResendCode} style={s.resendButton}>
                  <Text variant="body" color="link" weight="semibold">
                    Resend code
                  </Text>
                </Pressable>
              ) : (
                <Text variant="bodySmall" color="secondary" weight="medium">
                  Resend in 0:{resendCooldown.toString().padStart(2, "0")}
                </Text>
              )}
            </VStack>

            {/* Alternative Options */}
            <VStack align="center" style={{ marginBottom: tokens.spacing.component.lg }}>
              <Pressable
                onPress={handleResendCode}
                disabled={!canResend}
                style={[s.alternativeButton, !canResend && { opacity: 0.5 }]}
              >
                <Text variant="bodySmall" color="secondary" weight="medium">
                  Try voice call
                </Text>
              </Pressable>

              <Pressable
                onPress={handleWrongNumber}
                style={s.alternativeButton}
                disabled={isVerifying || isLoading}
              >
                <Text variant="bodySmall" color="secondary" weight="medium">
                  Wrong number?
                </Text>
              </Pressable>
            </VStack>

            {/* Manual Verify Button (fallback) */}
            <View style={s.verifyButtonContainer}>
              {code.length === 6 && !isVerifying && (
                <Button
                  variant="solid"
                  colorScheme="primary"
                  size="lg"
                  fullWidth
                  onPress={() => handleCodeComplete(code)}
                  loading={isVerifying}
                >
                  Verify Code
                </Button>
              )}
            </View>

            {/* Back Button */}
            <Box mt="lg" style={s.backButton}>
              <Button
                variant="ghost"
                colorScheme="secondary"
                onPress={onBack}
                disabled={isVerifying || isLoading}
              >
                Back
              </Button>
            </Box>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Box>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.spacing.layout.lg,
    paddingTop: tokens.spacing.layout.xl,
    paddingBottom: tokens.spacing.layout.lg,
    justifyContent: "center" as const,
  },
  resendButton: {
    padding: tokens.spacing.component.sm,
  },
  alternativeButton: {
    padding: tokens.spacing.component.md,
    marginVertical: tokens.spacing.component.xs,
  },
  verifyButtonContainer: {
    minHeight: 60,
    marginTop: tokens.spacing.component.lg,
    justifyContent: "center" as const,
  },
  backButton: {
    alignItems: "center" as const,
    padding: tokens.spacing.component.lg,
  },
}));

import { useState, useEffect } from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
} from "react-native";
import { storage } from "@/lib/storage";
import * as Haptics from "expo-haptics";
import { createStyles, useStyles } from "@/design-system/theme";
import { Box, Text, VStack, HStack, Button, Checkbox } from "@/design-system/styled";
import { tokens } from "@/design-system/tokens";
import { PhoneInput } from "./PhoneInput";
import { useAuthStore } from "../stores/authStore";
import { STORAGE_KEYS } from "@/constants";

interface PhoneAuthScreenProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function PhoneAuthScreen({ onSuccess, onCancel }: PhoneAuthScreenProps) {
  const s = useStyles(styles);

  const { sendVerificationCode, isLoading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    loadLastPhoneNumber();
  }, []);

  const loadLastPhoneNumber = async () => {
    try {
      const lastPhone = await storage.get<string>(STORAGE_KEYS.LAST_PHONE_NUMBER);
      if (lastPhone) {
        const match = lastPhone.match(/^(\+\d{1,3})(.*)$/);
        if (match) {
          setCountryCode(match[1] || "+1");
          setPhone(match[2] || "");
        }
      }
    } catch (error) {
      console.error("Failed to load last phone number:", error);
    }
  };

  const handleContinue = async () => {
    try {
      clearError();

      if (!agreedToTerms) {
        Alert.alert("Terms Required", "Please agree to the Terms of Service and Privacy Policy to continue.");
        return;
      }

      if (!phone.trim()) {
        Alert.alert("Phone Required", "Please enter your phone number.");
        return;
      }

      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) {
        Alert.alert("Invalid Phone", "Please enter a valid phone number.");
        return;
      }

      await sendVerificationCode({
        phone: digits,
        countryCode,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      onSuccess();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleTermsPress = () => {
    Alert.alert("Terms & Privacy", "In a real app, this would navigate to the Terms of Service and Privacy Policy.", [
      { text: "OK" },
    ]);
  };

  return (
    <Box style={s.container}>
      <KeyboardAvoidingView
        style={s.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Header */}
            <VStack align="center" gap="sm">
              <Text variant="h1" align="center">
                Welcome to Mealio
              </Text>
              <Text variant="body" color="secondary" align="center">
                Sync your meals across all devices
              </Text>
            </VStack>

            {/* Phone Input */}
            <Box mt="2xl">
              <PhoneInput
                value={phone}
                onChangeText={setPhone}
                countryCode={countryCode}
                onCountryChange={setCountryCode}
                placeholder="Phone number"
                error={error || undefined}
                disabled={isLoading}
                autoFocus
                onSubmitEditing={handleContinue}
              />

              <Text variant="bodySmall" color="secondary" align="center" style={{ marginTop: tokens.spacing.component.md }}>
                We'll text you a verification code
              </Text>
            </Box>

            {/* Terms Agreement */}
            <Box mt="2xl">
              <Pressable
                style={s.termsContainer}
                onPress={() => !isLoading && setAgreedToTerms(!agreedToTerms)}
                disabled={isLoading}
              >
                <Checkbox
                  checked={agreedToTerms}
                  onChange={setAgreedToTerms}
                  disabled={isLoading}
                  size="md"
                />
                <Box style={s.termsTextContainer}>
                  <Text variant="bodySmall" color="secondary">
                    I agree to the{" "}
                    <Text variant="bodySmall" color="link" underline onPress={handleTermsPress}>
                      Terms of Service
                    </Text>{" "}
                    and{" "}
                    <Text variant="bodySmall" color="link" underline onPress={handleTermsPress}>
                      Privacy Policy
                    </Text>
                  </Text>
                </Box>
              </Pressable>
            </Box>

            {/* Privacy Notice */}
            <Box mt="xl" align="center">
              <Text variant="caption" color="secondary" align="center">
                Your phone number is encrypted and never shared.
              </Text>
            </Box>

            {/* Continue Button */}
            <Box mt="xl">
              <Button
                variant="solid"
                colorScheme="primary"
                size="lg"
                fullWidth
                onPress={handleContinue}
                loading={isLoading}
                disabled={isLoading || !agreedToTerms}
              >
                Continue
              </Button>
            </Box>

            {/* Cancel/Skip Option */}
            {onCancel && (
              <Box mt="md" align="center" p="lg">
                <Button
                  variant="ghost"
                  colorScheme="secondary"
                  onPress={onCancel}
                  disabled={isLoading}
                >
                  Skip for now
                </Button>
              </Box>
            )}
          </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: tokens.spacing.layout.lg,
    paddingTop: tokens.spacing.layout.xl,
    paddingBottom: tokens.spacing.layout.lg,
  },
  termsContainer: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  termsTextContainer: {
    flex: 1,
    marginLeft: tokens.spacing.component.sm,
  },
}));

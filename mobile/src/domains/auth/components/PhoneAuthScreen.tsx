import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { storage } from "@/lib/storage";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "./PhoneInput";
import { useAuthStore } from "../stores/authStore";
import { STORAGE_KEYS } from "@/constants";

interface PhoneAuthScreenProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function PhoneAuthScreen({ onSuccess, onCancel }: PhoneAuthScreenProps) {
  const { theme } = useTheme();
  const { sendVerificationCode, isLoading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1"); // Default to US
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Load last used phone number on mount
  useEffect(() => {
    loadLastPhoneNumber();
  }, []);

  const loadLastPhoneNumber = async () => {
    try {
      const lastPhone = await storage.get<string>(STORAGE_KEYS.LAST_PHONE_NUMBER);
      if (lastPhone) {
        // Extract country code and phone number
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

      // Validate phone format
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) {
        Alert.alert("Invalid Phone", "Please enter a valid phone number.");
        return;
      }

      await sendVerificationCode({
        phone: digits,
        countryCode,
      });

      // Haptic feedback on success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      onSuccess();
    } catch (error) {
      // Error is handled by the store and displayed via error state
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleTermsPress = () => {
    Alert.alert("Terms & Privacy", "In a real app, this would navigate to the Terms of Service and Privacy Policy.", [
      { text: "OK" },
    ]);
  };

  const screenHeight = Dimensions.get("window").height;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Welcome to Mealio</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Sync your meals across all devices
              </Text>
            </View>

            {/* Phone Input */}
            <View style={styles.inputSection}>
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

              <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                📱 We'll text you a verification code
              </Text>
            </View>

            {/* Terms Agreement */}
            <View style={styles.termsSection}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                disabled={isLoading}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: agreedToTerms ? theme.colors.primary : "transparent",
                    },
                  ]}
                >
                  {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.termsTextContainer}>
                  <Text style={[styles.termsText, { color: theme.colors.textSecondary }]}>
                    I agree to the{" "}
                    <Text style={[styles.termsLink, { color: theme.colors.primary }]} onPress={handleTermsPress}>
                      Terms of Service
                    </Text>{" "}
                    and{" "}
                    <Text style={[styles.termsLink, { color: theme.colors.primary }]} onPress={handleTermsPress}>
                      Privacy Policy
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Privacy Notice */}
            <View style={styles.privacySection}>
              <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
                Your phone number is encrypted and never shared.
              </Text>
            </View>

            {/* Continue Button */}
            <Button
              title="Continue →"
              onPress={handleContinue}
              loading={isLoading}
              disabled={isLoading || !agreedToTerms}
              style={styles.continueButton}
              size="large"
            />

            {/* Cancel/Skip Option */}
            {onCancel && (
              <TouchableOpacity onPress={onCancel} style={styles.skipButton} disabled={isLoading}>
                <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>Skip for now</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 48,
  },
  helpText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
  termsSection: {
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkmark: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  privacySection: {
    marginBottom: 32,
    alignItems: "center",
  },
  privacyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  continueButton: {
    marginBottom: 16,
  },
  skipButton: {
    alignItems: "center",
    padding: 16,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

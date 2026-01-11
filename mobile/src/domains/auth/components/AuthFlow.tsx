import { useCallback } from "react";
import { View, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles, useTheme } from "@/design-system/theme";
import { Text } from "@/design-system/styled";
import { tokens } from "@/design-system/tokens";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { AppleSignInButton } from "./AppleSignInButton";
import { useAuthStore } from "../stores/authStore";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { useAppleAuth } from "../hooks/useAppleAuth";
import type { AuthCredential } from "../types";

// =============================================================================
// TYPES
// =============================================================================

interface AuthFlowProps {
  onComplete: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AuthFlow({ onComplete }: AuthFlowProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();

  const { login, isLoading } = useAuthStore();
  const { signIn: googleSignIn, isSigningIn: isGoogleSigningIn } = useGoogleAuth();
  const { signIn: appleSignIn, isSigningIn: isAppleSigningIn } = useAppleAuth();

  const isSigningIn = isGoogleSigningIn || isAppleSigningIn;

  const handleSignIn = useCallback(
    async (signInFn: () => Promise<AuthCredential | null>, providerName: string) => {
      try {
        const credential = await signInFn();
        if (credential) {
          await login(credential);
          onComplete();
        }
      } catch {
        Alert.alert("Error", `Failed to sign in with ${providerName}. Please try again.`);
      }
    },
    [login, onComplete]
  );

  const handleGoogleSignIn = useCallback(() => {
    handleSignIn(googleSignIn, "Google");
  }, [handleSignIn, googleSignIn]);

  const handleAppleSignIn = useCallback(() => {
    handleSignIn(appleSignIn, "Apple");
  }, [handleSignIn, appleSignIn]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <View style={s.titleSection}>
          <Text style={s.title}>Welcome to Mealio</Text>
          <Text style={s.subtitle}>Sign in to sync your meals across devices</Text>
        </View>

        <View style={s.buttonsSection}>
          <AppleSignInButton onPress={handleAppleSignIn} isLoading={isAppleSigningIn || isLoading} />
          <GoogleSignInButton onPress={handleGoogleSignIn} isLoading={isSigningIn || isLoading} />
        </View>
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>By continuing, you agree to our Terms of Service and Privacy Policy</Text>
      </View>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles(colors => ({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    paddingHorizontal: tokens.spacing.layout.sm,
    paddingVertical: tokens.spacing.component.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.spacing.layout.md,
    justifyContent: "center" as const,
  },
  titleSection: {
    alignItems: "center" as const,
    marginBottom: tokens.spacing.layout.xl,
  },
  title: {
    fontSize: tokens.typography.fontSize.h2,
    fontWeight: tokens.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: tokens.spacing.component.sm,
    textAlign: "center" as const,
  },
  subtitle: {
    fontSize: tokens.typography.fontSize.body,
    color: colors.text.secondary,
    textAlign: "center" as const,
  },
  buttonsSection: {
    gap: tokens.spacing.component.md,
  },
  footer: {
    paddingHorizontal: tokens.spacing.layout.md,
    paddingBottom: tokens.spacing.layout.md,
  },
  footerText: {
    fontSize: tokens.typography.fontSize.caption,
    textAlign: "center" as const,
    lineHeight: 18,
    color: colors.text.tertiary,
  },
}));

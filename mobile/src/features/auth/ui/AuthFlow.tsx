import { useCallback } from "react";
import { View, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles, useTheme } from "@/shared/ui/theme";
import { Text } from "@/shared/ui/styled";
import { tokens } from "@/shared/ui/tokens";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { AppleSignInButton } from "./AppleSignInButton";
import { useAuthStore } from "../model/authStore";
import { useGoogleAuth } from "../model/useGoogleAuth";
import { useAppleAuth } from "../model/useAppleAuth";
import { useMigration } from "@/entities/entry";
import type { AuthCredential } from "@/entities/user";
import { useAuthI18n, useCommonI18n } from "@/shared/lib/i18n";

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
  const auth = useAuthI18n();
  const common = useCommonI18n();

  const { login, isLoading } = useAuthStore();
  const { signIn: googleSignIn, isSigningIn: isGoogleSigningIn } = useGoogleAuth();
  const { signIn: appleSignIn, isSigningIn: isAppleSigningIn } = useAppleAuth();
  const { checkLocalEntries, migrateLocalEntries } = useMigration();

  const isSigningIn = isGoogleSigningIn || isAppleSigningIn;

  const promptMigration = useCallback(async () => {
    const count = await checkLocalEntries();
    if (count === 0) {
      onComplete();
      return;
    }

    Alert.alert(
      auth.syncLocalEntries,
      auth.syncLocalEntriesMessage(count),
      [
        {
          text: auth.skip,
          style: "cancel",
          onPress: () => onComplete(),
        },
        {
          text: auth.sync,
          onPress: async () => {
            try {
              await migrateLocalEntries();
            } catch {
              Alert.alert(auth.migrationError, auth.migrationErrorMessage);
            }
            onComplete();
          },
        },
      ],
    );
  }, [checkLocalEntries, migrateLocalEntries, onComplete, auth]);

  const handleSignIn = useCallback(
    async (signInFn: () => Promise<AuthCredential | null>, providerName: string) => {
      try {
        const credential = await signInFn();
        if (credential) {
          await login(credential);
          await promptMigration();
        }
      } catch {
        Alert.alert(common.error, auth.signInFailed(providerName));
      }
    },
    [login, promptMigration, common.error, auth],
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
        <Pressable onPress={handleBack} style={s.backButton}>
          <Ionicons name="chevron-back" size={tokens.size.icon.md} color={colors.text.primary} />
        </Pressable>
      </View>

      <View style={s.content}>
        <View style={s.titleSection}>
          <Text style={s.title}>{auth.welcomeTitle}</Text>
          <Text style={s.subtitle}>{auth.welcomeSubtitle}</Text>
        </View>

        <View style={s.buttonsSection}>
          <GoogleSignInButton onPress={handleGoogleSignIn} isLoading={isSigningIn || isLoading} label={auth.continueWithGoogle} />
          <AppleSignInButton onPress={handleAppleSignIn} isLoading={isAppleSigningIn || isLoading} label={auth.continueWithApple} />
        </View>
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>{auth.termsFooter}</Text>
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
    width: tokens.size.touchTarget.md,
    height: tokens.size.touchTarget.md,
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

import React from "react";
import { ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles, useTheme } from "@/shared/ui/theme";
import { Box, Text } from "@/shared/ui/styled";
import { tokens } from "@/shared/ui/tokens";
import { triggerHaptic } from "@/shared/lib/utils";

interface SettingsLayoutProps {
  title: string;
  children: React.ReactNode;
  showBackButton?: boolean;
}

export function SettingsLayout({ title, children, showBackButton = true }: SettingsLayoutProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();

  const handleBack = () => {
    triggerHaptic("LIGHT");
    router.back();
  };

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Header */}
      <Box style={s.header}>
        {showBackButton && (
          <Pressable
            style={s.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={tokens.size.icon.md} color={colors.text.primary} />
          </Pressable>
        )}

        <Box style={s.headerContent}>
          <Text style={s.title}>{title}</Text>
        </Box>
      </Box>

      {/* Scrollable Content */}
      <ScrollView
        style={s.scrollContainer}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: tokens.spacing.component.lg,
    paddingTop: tokens.spacing.component.sm,
    paddingBottom: tokens.spacing.component.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.divider,
  },
  backButton: {
    width: tokens.size.touchTarget.md,
    height: tokens.size.touchTarget.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: tokens.spacing.component.sm,
  },
  headerContent: {
    flex: 1,
    justifyContent: "center" as const,
  },
  title: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
    textAlign: "center" as const,
    marginRight: tokens.size.touchTarget.md,
    color: colors.text.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: tokens.spacing.component.lg,
    paddingBottom: tokens.spacing.layout.lg,
  },
}));

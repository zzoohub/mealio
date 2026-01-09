import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";
import { Button } from "@/design-system/styled";
import type { BaseComponentProps } from "@/types";

interface ErrorStateProps extends BaseComponentProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  fullScreen?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We encountered an error. Please try again.",
  onRetry,
  retryLabel = "Try again",
  icon = "alert-circle-outline",
  fullScreen = false,
  testID,
  style,
}: ErrorStateProps) {
  const { colors } = useTheme();

  const containerStyle = fullScreen ? styles.fullScreen : styles.inline;

  return (
    <View style={[containerStyle, style]} testID={testID}>
      <Ionicons name={icon} size={64} color={colors.status.error} style={styles.icon} testID={`${testID}-icon`} />

      <Text style={[styles.titleText, { color: colors.text.primary }]} testID={`${testID}-title`}>
        {title}
      </Text>

      <Text
        style={[styles.messageText, { color: colors.text.secondary }]}
        testID={`${testID}-message`}
      >
        {message}
      </Text>

      {onRetry && (
        <Button
          onPress={onRetry}
          variant="solid"
          colorScheme="primary"
          style={styles.retryButton}
          testID={`${testID}-retry-button`}
        >
          {retryLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.component.lg,
  },
  inline: {
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.component.lg,
  },
  icon: {
    marginBottom: tokens.spacing.component.lg,
  },
  titleText: {
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.semibold,
    textAlign: "center",
    marginBottom: tokens.spacing.component.sm,
  },
  messageText: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: tokens.spacing.component.xl,
  },
  retryButton: {
    minWidth: 120,
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createStyles, useStyles } from "@/design-system/theme";
import { tokens, iconSizes } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface InsightCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function InsightCard({ icon, iconColor, title, description }: InsightCardProps) {
  const s = useStyles(insightCardStyles);

  return (
    <View style={[styles.card, s.card]}>
      <Ionicons name={icon} size={iconSizes.md} color={iconColor} />
      <View style={styles.content}>
        <Text style={[styles.title, s.title]}>{title}</Text>
        <Text style={[styles.description, s.description]}>{description}</Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.component.lg,
    marginBottom: tokens.spacing.component.md,
  },
  content: {
    flex: 1,
    marginLeft: tokens.spacing.component.lg,
  },
  title: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.xs,
  },
  description: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
});

const insightCardStyles = createStyles((colors) => ({
  card: {
    backgroundColor: colors.bg.elevated,
  },
  title: {
    color: colors.text.primary,
  },
  description: {
    color: colors.text.secondary,
  },
}));

export default InsightCard;

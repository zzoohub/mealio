import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { createStyles, useStyles } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  progress: number;
  target: number;
  isCompleted: boolean;
}

export interface AchievementCardProps {
  achievement: Achievement;
  onPress?: (achievement: Achievement) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AchievementCard({ achievement, onPress }: AchievementCardProps) {
  const s = useStyles(achievementCardStyles);
  const progressWidth = `${(achievement.progress / achievement.target) * 100}%`;

  const handlePress = () => {
    onPress?.(achievement);
  };

  return (
    <TouchableOpacity style={[styles.card, s.card]} onPress={handlePress}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{achievement.emoji}</Text>
        <View style={styles.info}>
          <Text style={[styles.title, s.title]}>{achievement.title}</Text>
          <Text style={[styles.description, s.description]}>{achievement.description}</Text>
        </View>
        <View style={styles.progress}>
          <Text style={[styles.progressText, s.progressText]}>
            {achievement.progress}/{achievement.target}
          </Text>
        </View>
      </View>
      <View style={[styles.bar, s.bar]}>
        <View style={[styles.barFill, s.barFill, { width: progressWidth as any }]} />
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.component.lg,
    marginBottom: tokens.spacing.component.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: tokens.spacing.component.md,
  },
  emoji: {
    fontSize: 24,
    marginRight: tokens.spacing.component.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.xs,
  },
  description: {
    fontSize: tokens.typography.fontSize.caption,
  },
  progress: {
    alignItems: "flex-end",
  },
  progressText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  bar: {
    height: 4,
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
  },
});

const achievementCardStyles = createStyles((colors) => ({
  card: {
    backgroundColor: colors.bg.elevated,
  },
  title: {
    color: colors.text.primary,
  },
  description: {
    color: colors.text.secondary,
  },
  progressText: {
    color: colors.interactive.primary,
  },
  bar: {
    backgroundColor: colors.border.subtle,
  },
  barFill: {
    backgroundColor: colors.interactive.primary,
  },
}));

export default AchievementCard;

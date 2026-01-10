import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CircularProgress } from "./CircularProgress";
import { createStyles, useStyles } from "@/design-system/theme";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface ProgressRingProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProgressRing({ label, current, target, color, unit }: ProgressRingProps) {
  const s = useStyles(progressRingStyles);
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <View style={styles.container}>
      <CircularProgress size={80} strokeWidth={6} progress={percentage} color={color}>
        <View style={styles.content}>
          <Text style={[styles.value, s.value]}>{current}</Text>
          <Text style={[styles.unit, s.unit]}>{unit}</Text>
        </View>
      </CircularProgress>
      <Text style={[styles.label, s.label]}>{label}</Text>
      <Text style={[styles.target, s.target]}>
        {current}/{target} {unit}
      </Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
  },
  content: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  value: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.bold,
  },
  unit: {
    fontSize: tokens.typography.fontSize.caption,
  },
  label: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.medium,
    marginTop: tokens.spacing.component.sm,
  },
  target: {
    fontSize: tokens.typography.fontSize.caption,
    marginTop: tokens.spacing.component.xs,
  },
});

const progressRingStyles = createStyles((colors) => ({
  value: {
    color: colors.text.primary,
  },
  unit: {
    color: colors.text.secondary,
  },
  label: {
    color: colors.text.primary,
  },
  target: {
    color: colors.text.secondary,
  },
}));

export default ProgressRing;

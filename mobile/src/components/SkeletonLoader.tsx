import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/design-system/theme';

interface SkeletonLoaderProps {
  height?: number;
  width?: number | string;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  height = 20,
  width = '100%',
  borderRadius = 4,
  style
}: SkeletonLoaderProps) {
  const { colors } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          height,
          width,
          backgroundColor: colors.border.default,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * StatsSkeleton - Matches the exact layout of StatsContent component
 *
 * Layout structure to match:
 * - summaryCard with padding: tokens.spacing.layout.sm (20px)
 * - header: title + toggle buttons
 * - date label
 * - calorieOverview: main value + remaining value
 * - progressBar: 8px height
 */
export function StatsSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.bg.elevated }]}>
      {/* Header - matches summaryHeader in StatsContent */}
      <View style={styles.headerSkeleton}>
        <SkeletonLoader width={120} height={20} borderRadius={4} />
        {/* Toggle container */}
        <View style={styles.toggleSkeleton}>
          <SkeletonLoader width={72} height={28} borderRadius={6} />
        </View>
      </View>

      {/* Date label - matches summaryDate */}
      <SkeletonLoader width={100} height={14} borderRadius={4} style={styles.dateSkeleton} />

      {/* Calorie Overview - matches calorieOverview layout */}
      <View style={styles.calorieOverviewSkeleton}>
        {/* Main calorie section */}
        <View style={styles.calorieMainSkeleton}>
          <SkeletonLoader width={100} height={40} borderRadius={4} style={{ marginBottom: 4 }} />
          <SkeletonLoader width={120} height={14} borderRadius={4} />
        </View>
        {/* Remaining section */}
        <View style={styles.calorieRemainingSkeleton}>
          <SkeletonLoader width={60} height={28} borderRadius={4} style={{ marginBottom: 4 }} />
          <SkeletonLoader width={80} height={14} borderRadius={4} />
        </View>
      </View>

      {/* Progress Bar - matches progressBar (8px height) */}
      <SkeletonLoader width="100%" height={8} borderRadius={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Match StatsContent summaryCard styling
  summaryCard: {
    borderRadius: 16, // tokens.radius.xl
    padding: 20, // tokens.spacing.layout.sm
    marginBottom: 20, // tokens.spacing.layout.sm
  },
  // Match summaryHeader layout
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4, // tokens.spacing.component.xs
  },
  toggleSkeleton: {
    // Container for toggle buttons
  },
  // Match summaryDate spacing
  dateSkeleton: {
    marginBottom: 16, // tokens.spacing.component.lg
  },
  // Match calorieOverview layout
  calorieOverviewSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16, // tokens.spacing.component.lg
  },
  calorieMainSkeleton: {
    alignItems: 'flex-start',
  },
  calorieRemainingSkeleton: {
    alignItems: 'flex-end',
  },
});
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

export function StatsSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.bg.secondary }]}>
      {/* Header Skeleton */}
      <View style={styles.headerSkeleton}>
        <View style={styles.headerLeft}>
          <SkeletonLoader width={120} height={18} style={{ marginBottom: 4 }} />
          <SkeletonLoader width={80} height={14} />
        </View>
        <View style={styles.toggleSkeleton}>
          <SkeletonLoader width={60} height={24} borderRadius={4} />
        </View>
      </View>

      {/* Metrics Type Skeleton */}
      <View style={styles.metricsTypeSkeleton}>
        <SkeletonLoader width={100} height={16} />
      </View>

      {/* Stats Grid Skeleton */}
      <View style={styles.statsGrid}>
        {[...Array(6)].map((_, index) => (
          <View key={index} style={styles.statItem}>
            <SkeletonLoader width={60} height={20} style={{ marginBottom: 4 }} />
            <SkeletonLoader width={40} height={14} style={{ marginBottom: 2 }} />
            <SkeletonLoader width={50} height={12} />
          </View>
        ))}
      </View>

      {/* Progress Bars Skeleton */}
      <View style={styles.progressSection}>
        {[...Array(3)].map((_, index) => (
          <View key={index} style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <SkeletonLoader width={60} height={14} />
              <SkeletonLoader width={40} height={12} />
            </View>
            <SkeletonLoader width="100%" height={6} borderRadius={3} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    alignItems: 'center',
  },
  toggleSkeleton: {
    // Empty for now
  },
  metricsTypeSkeleton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressSection: {
    gap: 16,
  },
  progressItem: {
    // Empty for now
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
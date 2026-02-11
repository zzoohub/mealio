/**
 * Responsive utilities for cross-device layout consistency.
 *
 * Uses `useWindowDimensions()` (reactive) instead of `Dimensions.get()` (static).
 * Combined with `useSafeAreaInsets()` for notch/home-indicator awareness.
 */

import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

// =============================================================================
// BREAKPOINTS
// =============================================================================

/** Screen width breakpoints (logical pixels) */
const BREAKPOINTS = {
  /** iPhone SE, small Android (< 375) */
  small: 375,
  /** iPhone 14/15, standard Android (375–413) */
  medium: 414,
  /** iPhone Pro Max, tablets (414+) */
  large: 414,
} as const;

// =============================================================================
// HOOK
// =============================================================================

export interface ResponsiveInfo {
  /** Current screen width */
  width: number;
  /** Current screen height */
  height: number;
  /** Safe area insets */
  insets: EdgeInsets;
  /** Screen < 375px (iPhone SE, small Android) */
  isSmallScreen: boolean;
  /** Screen 375–413px (standard phones) */
  isMediumScreen: boolean;
  /** Screen >= 414px (large phones, tablets) */
  isLargeScreen: boolean;
  /** Calculate grid item size for N columns with a given gap */
  gridItemSize: (columns: number, gap: number, horizontalPadding?: number) => number;
}

/**
 * Reactive responsive hook — re-renders on screen dimension or inset changes.
 *
 * Replaces static `Dimensions.get('window')` calls.
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallScreen = width < BREAKPOINTS.small;
  const isMediumScreen = width >= BREAKPOINTS.small && width < BREAKPOINTS.large;
  const isLargeScreen = width >= BREAKPOINTS.large;

  const gridItemSize = (columns: number, gap: number, horizontalPadding = 0): number => {
    const totalGap = gap * (columns - 1);
    return (width - totalGap - horizontalPadding * 2) / columns;
  };

  return {
    width,
    height,
    insets,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    gridItemSize,
  };
}

// =============================================================================
// HELPER
// =============================================================================

interface ResponsiveValues<T> {
  /** Value for small screens (< 375px) */
  small: T;
  /** Value for medium screens (375–413px). Falls back to `small` if omitted. */
  medium?: T;
  /** Value for large screens (>= 414px). Falls back to `medium` then `small`. */
  large?: T;
}

/**
 * Pick a value based on current screen width.
 *
 * @example
 * const cardWidth = responsiveValue(screenWidth, { small: 120, medium: 140, large: 160 });
 */
export function responsiveValue<T>(screenWidth: number, values: ResponsiveValues<T>): T {
  if (screenWidth >= BREAKPOINTS.large) {
    return values.large ?? values.medium ?? values.small;
  }
  if (screenWidth >= BREAKPOINTS.small) {
    return values.medium ?? values.small;
  }
  return values.small;
}

/**
 * Themed Styles Utilities
 *
 * Provides utilities for creating theme-aware styles.
 * Styles are defined at the BOTTOM of files for better readability.
 *
 * @example
 * ```tsx
 * import { createStyles, useStyles } from '@/design-system/theme';
 * import { tokens } from '@/design-system/tokens';
 *
 * // Component FIRST (logic is important)
 * export function MyComponent() {
 *   const s = useStyles(styles);
 *   return (
 *     <View style={s.container}>
 *       <Text style={s.title}>Hello</Text>
 *     </View>
 *   );
 * }
 *
 * // Styles at BOTTOM (less important)
 * const styles = createStyles((colors) => ({
 *   container: {
 *     backgroundColor: colors.bg.primary,
 *     padding: tokens.spacing.component.md,
 *   },
 *   title: {
 *     color: colors.text.primary,
 *     fontSize: tokens.typography.fontSize.h2,
 *   },
 * }));
 * ```
 */

import { useMemo } from "react";
import { StyleSheet, type ViewStyle, type TextStyle, type ImageStyle } from "react-native";
import { useTheme } from "./useTheme";
import type { ThemeColors, ThemeElevation } from "./ThemeContext";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported style types for StyleSheet
 */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Style factory function - takes colors, returns styles
 */
export type StyleFactory<T extends NamedStyles<T>> = (colors: ThemeColors, extras: StyleExtras) => T;

/**
 * Extra theme info passed to style factory (optional use)
 */
export interface StyleExtras {
  /** Current elevation/shadow styles */
  elevation: ThemeElevation;
  /** Whether current theme is dark */
  isDark: boolean;
}

// Re-export ThemeColors for convenience
export type { ThemeColors } from "./ThemeContext";

// =============================================================================
// STYLE CREATION - Define styles OUTSIDE components
// =============================================================================

/**
 * Create a style factory function
 *
 * Use this to define styles outside your component.
 * Tokens should be imported directly since they never change.
 *
 * @param factory - Function that takes colors and returns style object
 * @returns The same factory (for type inference)
 *
 * @example
 * ```tsx
 * import { tokens } from '@/design-system/tokens';
 * import { createStyles } from '@/design-system/theme';
 *
 * // Define at module level
 * const styles = createStyles((colors) => ({
 *   container: {
 *     backgroundColor: colors.bg.primary,
 *     padding: tokens.spacing.component.md,
 *     borderRadius: tokens.radius.md,
 *   },
 *   title: {
 *     color: colors.text.primary,
 *     fontSize: tokens.typography.fontSize.h2,
 *   },
 *   // Use elevation when needed
 *   card: {
 *     backgroundColor: colors.bg.elevated,
 *   },
 * }));
 *
 * // Access isDark for conditional styles
 * const stylesWithDark = createStyles((colors, { isDark }) => ({
 *   icon: {
 *     opacity: isDark ? 0.9 : 1,
 *     tintColor: colors.text.primary,
 *   },
 * }));
 * ```
 */
export function createStyles<T extends NamedStyles<T>>(factory: StyleFactory<T>): StyleFactory<T> {
  return factory;
}

// =============================================================================
// HOOK - Use styles INSIDE components
// =============================================================================

/**
 * Hook to use themed styles inside a component
 *
 * Takes a style factory created with `createStyles` and returns
 * memoized StyleSheet that updates when theme changes.
 *
 * @param styleFactory - Style factory created with createStyles
 * @returns Memoized StyleSheet
 *
 * @example
 * ```tsx
 * import { createStyles, useStyles } from '@/design-system/theme';
 * import { tokens } from '@/design-system/tokens';
 *
 * // Outside component
 * const styles = createStyles((colors) => ({
 *   container: {
 *     backgroundColor: colors.bg.primary,
 *     padding: tokens.spacing.component.md,
 *   },
 * }));
 *
 * // Inside component
 * function MyComponent() {
 *   const s = useStyles(styles);
 *   return <View style={s.container} />;
 * }
 * ```
 */
export function useStyles<T extends NamedStyles<T>>(styleFactory: StyleFactory<T>): T {
  const { colors, elevation, isDark } = useTheme();

  const styles = useMemo(
    () => StyleSheet.create(styleFactory(colors, { elevation, isDark })),
    [styleFactory, colors, elevation, isDark],
  );

  return styles;
}

// =============================================================================
// ALTERNATIVE: Direct usage without createStyles wrapper
// =============================================================================

/**
 * Hook for inline style creation (less recommended, but available)
 *
 * Use `createStyles` + `useStyles` for better code organization.
 * This is available for cases where you need styles defined inline.
 *
 * @deprecated Prefer createStyles + useStyles pattern for better readability
 *
 * @example
 * ```tsx
 * // Not recommended - styles inside component
 * function MyComponent() {
 *   const styles = useThemedStyles((colors) => ({
 *     container: { backgroundColor: colors.bg.primary },
 *   }));
 *   return <View style={styles.container} />;
 * }
 *
 * // Recommended - styles outside component
 * const styles = createStyles((colors) => ({
 *   container: { backgroundColor: colors.bg.primary },
 * }));
 *
 * function MyComponent() {
 *   const s = useStyles(styles);
 *   return <View style={s.container} />;
 * }
 * ```
 */
export function useThemedStyles<T extends NamedStyles<T>>(styleFactory: StyleFactory<T>): T {
  return useStyles(styleFactory);
}

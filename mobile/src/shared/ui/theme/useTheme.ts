/**
 * useTheme Hook
 *
 * Primary hook for consuming theme context in components.
 * Provides access to theme colors, color scheme, and theme controls.
 *
 * @example
 * ```tsx
 * import { useTheme } from '@/shared/ui/theme';
 *
 * function MyComponent() {
 *   const { colors, isDark, setTheme } = useTheme();
 *
 *   return (
 *     <View style={{ backgroundColor: colors.bg.primary }}>
 *       <Text style={{ color: colors.text.primary }}>
 *         Current theme: {isDark ? 'Dark' : 'Light'}
 *       </Text>
 *       <Button onPress={() => setTheme('dark')}>
 *         Switch to Dark
 *       </Button>
 *     </View>
 *   );
 * }
 * ```
 */

import { useContext } from 'react';
import {
  ThemeContext,
  type ThemeContextValue,
  type ThemeColors,
  type ThemeElevation,
  type ColorScheme,
  type ThemePreference,
} from './ThemeContext';

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for accessing theme context values
 *
 * Returns the complete theme context including:
 * - `colors` - Current theme colors (semantic tokens resolved for current theme)
 * - `colorScheme` - The resolved color scheme ('light' | 'dark')
 * - `setTheme` - Function to change theme preference
 * - `toggleTheme` - Function to toggle between light and dark
 * - `isDark` / `isLight` - Boolean helpers
 * - `themePreference` - Current preference ('light' | 'dark' | 'system')
 * - `theme` - Complete theme object with colors and elevation
 * - `elevation` - Theme-specific shadow/elevation tokens
 * - `statusBarStyle` - Status bar style for current theme
 *
 * @returns ThemeContextValue - All theme context values and controls
 * @throws Warning in development if used outside ThemeProvider
 *
 * @example
 * ```tsx
 * // Basic color usage
 * function Card() {
 *   const { colors, elevation } = useTheme();
 *
 *   return (
 *     <View style={[
 *       { backgroundColor: colors.bg.elevated },
 *       elevation.card,
 *     ]}>
 *       <Text style={{ color: colors.text.primary }}>
 *         Card Content
 *       </Text>
 *     </View>
 *   );
 * }
 *
 * // Theme switching
 * function ThemeToggle() {
 *   const { isDark, toggleTheme, setTheme, themePreference } = useTheme();
 *
 *   return (
 *     <>
 *       <Switch value={isDark} onValueChange={toggleTheme} />
 *       <SegmentedControl
 *         values={['Light', 'Dark', 'System']}
 *         selectedIndex={['light', 'dark', 'system'].indexOf(themePreference)}
 *         onChange={(e) => setTheme(['light', 'dark', 'system'][e.nativeEvent.selectedSegmentIndex])}
 *       />
 *     </>
 *   );
 * }
 *
 * // Status bar management
 * function Screen() {
 *   const { statusBarStyle } = useTheme();
 *
 *   return (
 *     <>
 *       <StatusBar barStyle={statusBarStyle} />
 *       <Content />
 *     </>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  // In development, warn if used outside provider
  // The context has default values, so it will still work
  if (__DEV__ && context.setTheme.toString().includes('console.warn')) {
    // Context is using default value (outside provider)
    // Warning will be shown when setTheme is called
  }

  return context;
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Hook that returns only the current theme colors
 *
 * Use this when you only need colors and want to minimize re-renders
 * to cases where colors actually change.
 *
 * @returns ThemeColors - Current theme color tokens
 *
 * @example
 * ```tsx
 * function ColoredBox() {
 *   const colors = useThemeColors();
 *
 *   return (
 *     <View style={{
 *       backgroundColor: colors.interactive.primary,
 *       borderColor: colors.border.default,
 *     }} />
 *   );
 * }
 * ```
 */
export function useThemeColors(): ThemeColors {
  const { colors } = useTheme();
  return colors;
}

/**
 * Hook that returns the current color scheme
 *
 * Useful for conditional rendering based on theme.
 *
 * @returns ColorScheme - 'light' or 'dark'
 *
 * @example
 * ```tsx
 * function Logo() {
 *   const colorScheme = useColorScheme();
 *
 *   return (
 *     <Image
 *       source={colorScheme === 'dark' ? logoDark : logoLight}
 *     />
 *   );
 * }
 * ```
 */
export function useColorScheme(): ColorScheme {
  const { colorScheme } = useTheme();
  return colorScheme;
}

/**
 * Hook that returns whether dark mode is active
 *
 * @returns boolean - true if dark mode is active
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const isDark = useIsDarkMode();
 *
 *   // Use different animation for dark mode
 *   const animation = isDark ? darkAnimation : lightAnimation;
 *
 *   return <Animated style={animation}>...</Animated>;
 * }
 * ```
 */
export function useIsDarkMode(): boolean {
  const { isDark } = useTheme();
  return isDark;
}

/**
 * Hook that returns theme elevation (shadow) styles
 *
 * @returns ThemeElevation - Shadow styles for current theme
 *
 * @example
 * ```tsx
 * function ElevatedCard() {
 *   const elevation = useThemeElevation();
 *
 *   return (
 *     <View style={[styles.card, elevation.card]}>
 *       <Text>Elevated Content</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useThemeElevation(): ThemeElevation {
  const { elevation } = useTheme();
  return elevation;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { ThemeContextValue, ThemeColors, ThemeElevation, ColorScheme, ThemePreference };

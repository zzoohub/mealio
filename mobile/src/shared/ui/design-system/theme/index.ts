/**
 * Theme System
 *
 * Complete theming solution for the design system.
 *
 * @example
 * ```tsx
 * import { createStyles, useStyles, useTheme } from '@/design-system/theme';
 * import { tokens } from '@/design-system/tokens';
 *
 * // Component FIRST (logic is important)
 * export function MyComponent() {
 *   const s = useStyles(styles);
 *   const { colors } = useTheme(); // for non-style props (icon color, etc.)
 *
 *   return (
 *     <View style={s.container}>
 *       <Icon color={colors.text.primary} />
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
 * }));
 * ```
 */

// =============================================================================
// CONTEXT
// =============================================================================

export { ThemeContext } from './ThemeContext';
export type {
  ThemeContextValue,
  ThemePreference,
  ColorScheme,
} from './ThemeContext';

// =============================================================================
// PROVIDER
// =============================================================================

export { ThemeProvider } from './ThemeProvider';
export type { ThemeProviderProps } from './ThemeProvider';

// =============================================================================
// HOOKS
// =============================================================================

// Main hook
export { useTheme } from './useTheme';

// Convenience hooks
export {
  useThemeColors,
  useColorScheme,
  useIsDarkMode,
  useThemeElevation,
} from './useTheme';

// Style utilities (recommended pattern)
export { createStyles, useStyles } from './useThemedStyles';

// Legacy (deprecated - use createStyles + useStyles instead)
export { useThemedStyles } from './useThemedStyles';

export type { StyleFactory, StyleExtras } from './useThemedStyles';

// =============================================================================
// THEME TYPES (RE-EXPORTED FROM CONTEXT)
// =============================================================================

export type {
  Theme,
  ThemeName,
  ThemeColors,
  ThemeElevation,
} from './ThemeContext';

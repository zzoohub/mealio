/**
 * Theme Context
 *
 * Provides theme state and theme-aware values to the component tree.
 * This context holds the resolved theme colors based on the current
 * theme preference (light, dark, or system).
 *
 * @example
 * ```tsx
 * import { ThemeProvider, useTheme } from '@/shared/ui/theme';
 *
 * // Wrap your app
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 *
 * // Consume in components
 * function MyComponent() {
 *   const { colors, isDark } = useTheme();
 *   return <View style={{ backgroundColor: colors.bg.primary }} />;
 * }
 * ```
 */

import { createContext } from 'react';
import type { Theme, ThemeColors, ThemeElevation, ThemeName } from '../tokens/themes';
import { lightTheme } from '../tokens/themes';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Theme preference value - what the user has selected
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Resolved color scheme - the actual theme being displayed
 */
export type ColorScheme = 'light' | 'dark';

/**
 * Theme context value provided to consumers
 */
export interface ThemeContextValue {
  /**
   * Current theme preference (light, dark, or system)
   */
  themePreference: ThemePreference;

  /**
   * Resolved color scheme after system preference resolution
   * This is always 'light' or 'dark', never 'system'
   */
  colorScheme: ColorScheme;

  /**
   * The complete resolved theme object
   */
  theme: Theme;

  /**
   * Current theme colors (semantic tokens resolved for current theme)
   * Shorthand for `theme.colors`
   */
  colors: ThemeColors;

  /**
   * Current theme elevations (shadows resolved for current theme)
   * Shorthand for `theme.elevation`
   */
  elevation: ThemeElevation;

  /**
   * Status bar style for the current theme
   */
  statusBarStyle: 'light-content' | 'dark-content';

  /**
   * Whether the current resolved theme is dark
   */
  isDark: boolean;

  /**
   * Whether the current resolved theme is light
   */
  isLight: boolean;

  /**
   * Update the theme preference
   * @param preference - The new theme preference ('light', 'dark', or 'system')
   */
  setTheme: (preference: ThemePreference) => void;

  /**
   * Toggle between light and dark themes
   * If currently on system, switches to the opposite of the current resolved theme
   */
  toggleTheme: () => void;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/**
 * Default context value (light theme)
 * Used when context is consumed outside of ThemeProvider
 */
const defaultContextValue: ThemeContextValue = {
  themePreference: 'system',
  colorScheme: 'light',
  theme: lightTheme,
  colors: lightTheme.colors,
  elevation: lightTheme.elevation,
  statusBarStyle: lightTheme.statusBar,
  isDark: false,
  isLight: true,
  setTheme: () => {
    if (__DEV__) {
      console.warn(
        'ThemeContext: setTheme was called outside of ThemeProvider. ' +
        'Wrap your app with <ThemeProvider> to enable theme switching.'
      );
    }
  },
  toggleTheme: () => {
    if (__DEV__) {
      console.warn(
        'ThemeContext: toggleTheme was called outside of ThemeProvider. ' +
        'Wrap your app with <ThemeProvider> to enable theme switching.'
      );
    }
  },
};

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * Theme context for providing theme values throughout the app
 *
 * @example
 * ```tsx
 * // Direct context usage (prefer useTheme hook instead)
 * import { ThemeContext } from '@/shared/ui/theme';
 *
 * function MyComponent() {
 *   const themeContext = useContext(ThemeContext);
 *   // ...
 * }
 * ```
 */
export const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

// Set display name for React DevTools
ThemeContext.displayName = 'ThemeContext';

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { Theme, ThemeColors, ThemeElevation, ThemeName };

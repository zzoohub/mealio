/**
 * Theme Provider
 *
 * Provides theme context to the component tree with support for:
 * - Light/dark/system theme preferences
 * - System color scheme detection via React Native's useColorScheme
 * - Integration with existing settingsStore (optional)
 * - Memoized values to prevent unnecessary re-renders
 *
 * @example
 * ```tsx
 * // Basic usage (standalone)
 * import { ThemeProvider } from '@/design-system/theme';
 *
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <MyApp />
 *     </ThemeProvider>
 *   );
 * }
 *
 * // With initial preference
 * <ThemeProvider initialPreference="dark">
 *   <MyApp />
 * </ThemeProvider>
 *
 * // With external preference (e.g., from settingsStore)
 * function App() {
 *   const { display } = useSettingsStore();
 *   return (
 *     <ThemeProvider preference={display.theme}>
 *       <MyApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */

import React, { useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import {
  ThemeContext,
  type ThemeContextValue,
  type ThemePreference,
  type ColorScheme,
} from './ThemeContext';
import { lightTheme, darkTheme, type Theme } from '../tokens/themes';

// =============================================================================
// TYPES
// =============================================================================

export interface ThemeProviderProps {
  /**
   * Child components to receive theme context
   */
  children: ReactNode;

  /**
   * Initial theme preference (only used if `preference` is not provided)
   * @default 'system'
   */
  initialPreference?: ThemePreference;

  /**
   * Controlled theme preference from external state (e.g., settingsStore)
   * When provided, the provider becomes controlled and uses this value
   */
  preference?: ThemePreference;

  /**
   * Callback when theme preference changes (for controlled mode)
   * Called when setTheme is invoked
   */
  onPreferenceChange?: (preference: ThemePreference) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Resolve theme preference to actual color scheme
 */
function resolveColorScheme(
  preference: ThemePreference,
  systemColorScheme: ColorScheme | null | undefined
): ColorScheme {
  if (preference === 'system') {
    // Default to light if system preference is unavailable
    return systemColorScheme ?? 'light';
  }
  return preference;
}

/**
 * Get theme object from color scheme
 */
function getThemeFromColorScheme(colorScheme: ColorScheme): Theme {
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

/**
 * Theme provider component that manages theme state and provides
 * theme context to all descendant components.
 *
 * Supports both controlled and uncontrolled modes:
 * - Uncontrolled: Uses internal state, optionally initialized with `initialPreference`
 * - Controlled: Uses `preference` prop, calls `onPreferenceChange` on updates
 *
 * @example
 * ```tsx
 * // Uncontrolled (manages own state)
 * <ThemeProvider initialPreference="system">
 *   <App />
 * </ThemeProvider>
 *
 * // Controlled (external state management)
 * const [theme, setTheme] = useState<ThemePreference>('system');
 * <ThemeProvider preference={theme} onPreferenceChange={setTheme}>
 *   <App />
 * </ThemeProvider>
 *
 * // Integration with settingsStore
 * function AppRoot() {
 *   const { display, updateDisplay } = useSettingsStore();
 *
 *   const handleThemeChange = useCallback((preference: ThemePreference) => {
 *     updateDisplay({ theme: preference });
 *   }, [updateDisplay]);
 *
 *   return (
 *     <ThemeProvider
 *       preference={display.theme}
 *       onPreferenceChange={handleThemeChange}
 *     >
 *       <App />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function ThemeProvider({
  children,
  initialPreference = 'system',
  preference: controlledPreference,
  onPreferenceChange,
}: ThemeProviderProps): React.JSX.Element {
  // ==========================================================================
  // STATE
  // ==========================================================================

  // Internal state for uncontrolled mode
  const [internalPreference, setInternalPreference] = useState<ThemePreference>(initialPreference);

  // Determine if we're in controlled mode
  const isControlled = controlledPreference !== undefined;

  // Get the actual preference value
  const themePreference = isControlled ? controlledPreference : internalPreference;

  // Get system color scheme from React Native
  const systemColorScheme = useSystemColorScheme() as ColorScheme | null;

  // ==========================================================================
  // DERIVED VALUES (MEMOIZED)
  // ==========================================================================

  // Resolve the actual color scheme to use
  const colorScheme = useMemo(
    () => resolveColorScheme(themePreference, systemColorScheme),
    [themePreference, systemColorScheme]
  );

  // Get the theme object based on resolved color scheme
  const theme = useMemo(
    () => getThemeFromColorScheme(colorScheme),
    [colorScheme]
  );

  // Boolean helpers
  const isDark = colorScheme === 'dark';
  const isLight = colorScheme === 'light';

  // ==========================================================================
  // CALLBACKS
  // ==========================================================================

  /**
   * Update theme preference
   * In controlled mode, calls onPreferenceChange
   * In uncontrolled mode, updates internal state
   */
  const setTheme = useCallback(
    (newPreference: ThemePreference) => {
      if (isControlled) {
        onPreferenceChange?.(newPreference);
      } else {
        setInternalPreference(newPreference);
      }
    },
    [isControlled, onPreferenceChange]
  );

  /**
   * Toggle between light and dark themes
   * If on system, switches to the opposite of current resolved theme
   */
  const toggleTheme = useCallback(() => {
    const newScheme: ThemePreference = isDark ? 'light' : 'dark';
    setTheme(newScheme);
  }, [isDark, setTheme]);

  // ==========================================================================
  // SYNC INTERNAL STATE WITH CONTROLLED PREFERENCE
  // ==========================================================================

  // When switching from controlled to uncontrolled, sync internal state
  useEffect(() => {
    if (!isControlled && controlledPreference === undefined) {
      // Already uncontrolled, nothing to sync
      return;
    }
  }, [isControlled, controlledPreference]);

  // ==========================================================================
  // CONTEXT VALUE (MEMOIZED)
  // ==========================================================================

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      colorScheme,
      theme,
      colors: theme.colors,
      elevation: theme.elevation,
      statusBarStyle: theme.statusBar,
      isDark,
      isLight,
      setTheme,
      toggleTheme,
    }),
    [
      themePreference,
      colorScheme,
      theme,
      isDark,
      isLight,
      setTheme,
      toggleTheme,
    ]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Set display name for React DevTools
ThemeProvider.displayName = 'ThemeProvider';

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { ThemePreference, ColorScheme };

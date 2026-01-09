/**
 * Theme Exports
 *
 * Central export for all theme definitions.
 * Provides type-safe theme objects and utilities.
 */

export { lightTheme, lightColors, lightElevations } from './light.tokens';
export type { LightTheme } from './light.tokens';

export { darkTheme, darkColors, darkElevations } from './dark.tokens';
export type { DarkTheme } from './dark.tokens';

import { lightTheme } from './light.tokens';
import { darkTheme } from './dark.tokens';

// =============================================================================
// THEME TYPES
// =============================================================================

/**
 * Union type for theme names
 */
export type ThemeName = 'light' | 'dark' | 'system';

/**
 * Theme object type (both themes share the same structure)
 */
export type Theme = typeof lightTheme | typeof darkTheme;

/**
 * Theme colors type (extracted from theme structure)
 */
export type ThemeColors = Theme['colors'];

/**
 * Theme elevation type
 */
export type ThemeElevation = Theme['elevation'];

// =============================================================================
// THEME MAP
// =============================================================================

/**
 * Map of theme names to theme objects
 */
export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

/**
 * Get theme by name
 */
export function getTheme(name: 'light' | 'dark'): Theme {
  return themes[name];
}

// =============================================================================
// DEFAULT THEME
// =============================================================================

/**
 * Default theme (used before user preference is loaded)
 */
export const defaultTheme = lightTheme;

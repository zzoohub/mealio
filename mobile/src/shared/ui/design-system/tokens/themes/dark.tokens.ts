/**
 * Dark Theme Tokens
 *
 * Theme-specific remapping of semantic tokens for dark mode.
 * Inverts background/text colors while maintaining brand consistency.
 *
 * Key differences from light theme:
 * - Backgrounds go dark (gray[900-1000])
 * - Text becomes light (gray[0-200])
 * - Surfaces use subtle lightening instead of darkening
 * - Status colors slightly desaturated for dark backgrounds
 */

import { primitives } from '../primitive.tokens';

// =============================================================================
// DARK THEME COLOR TOKENS
// =============================================================================

export const darkColors = {
  bg: {
    /** Primary app background - pure black */
    primary: primitives.color.gray[1000],
    /** Secondary/surface background - subtle elevation */
    secondary: primitives.color.gray[900],
    /** Tertiary/nested background */
    tertiary: primitives.color.gray[800],
    /** Inverted background - white for contrast */
    inverse: primitives.color.gray[50],
    /** Overlay/backdrop - lighter overlay for visibility */
    overlay: `rgba(0, 0, 0, ${primitives.opacity[70]})`,
    /** Disabled background */
    disabled: primitives.color.gray[800],
    /** Elevated surface (cards with shadow) */
    elevated: primitives.color.gray[900],
  },

  text: {
    /** Primary text - near white */
    primary: primitives.color.gray[50],
    /** Secondary text - lighter gray */
    secondary: primitives.color.gray[400],
    /** Tertiary/placeholder text */
    tertiary: primitives.color.gray[500],
    /** Inverted text - dark on light */
    inverse: primitives.color.gray[900],
    /** Disabled text */
    disabled: primitives.color.gray[600],
    /** Link text - slightly lighter for dark bg */
    link: primitives.color.orange[400],
    /** Link active state */
    linkActive: primitives.color.orange[300],
  },

  interactive: {
    /** Primary brand action - slightly lighter for visibility */
    primary: primitives.color.orange[500],
    /** Primary hover */
    primaryHover: primitives.color.orange[400],
    /** Primary pressed */
    primaryActive: primitives.color.orange[600],
    /** Secondary brand action */
    secondary: primitives.color.teal[500],
    /** Secondary hover */
    secondaryHover: primitives.color.teal[400],
    /** Secondary pressed */
    secondaryActive: primitives.color.teal[600],
    /** Subtle/ghost background */
    subtle: primitives.color.gray[800],
    /** Subtle hover */
    subtleHover: primitives.color.gray[700],
    /** Subtle pressed */
    subtleActive: primitives.color.gray[600],
    /** Disabled state */
    disabled: primitives.color.gray[700],
  },

  border: {
    /** Default border - lighter gray for visibility */
    default: primitives.color.gray[700],
    /** Strong border */
    strong: primitives.color.gray[600],
    /** Subtle border */
    subtle: primitives.color.gray[800],
    /** Focus ring - same brand color */
    focus: primitives.color.orange[500],
    /** Divider lines */
    divider: primitives.color.gray[800],
    /** Disabled border */
    disabled: primitives.color.gray[800],
  },

  status: {
    /** Error/destructive - slightly lighter */
    error: primitives.color.red[400],
    /** Error background - very dark red tint */
    errorBg: `rgba(231, 76, 60, ${primitives.opacity[20]})`,
    /** Error border */
    errorBorder: primitives.color.red[800],
    /** Success/positive - slightly lighter */
    success: primitives.color.green[400],
    /** Success background - very dark green tint */
    successBg: `rgba(46, 204, 113, ${primitives.opacity[20]})`,
    /** Success border */
    successBorder: primitives.color.green[800],
    /** Warning/caution - slightly lighter */
    warning: primitives.color.yellow[400],
    /** Warning background - very dark yellow tint */
    warningBg: `rgba(243, 156, 18, ${primitives.opacity[20]})`,
    /** Warning border */
    warningBorder: primitives.color.yellow[800],
    /** Info/neutral - slightly lighter */
    info: primitives.color.blue[400],
    /** Info background - very dark blue tint */
    infoBg: `rgba(52, 152, 219, ${primitives.opacity[20]})`,
    /** Info border */
    infoBorder: primitives.color.blue[800],
  },
} as const;

// =============================================================================
// DARK THEME ELEVATION (with adjusted shadow colors)
// =============================================================================

/**
 * Shadows in dark mode are less visible, so we use
 * a combination of shadows and subtle surface elevation (lighter bg)
 */
export const darkElevations = {
  none: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdown: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  overlay: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

// =============================================================================
// DARK THEME COMPLETE EXPORT
// =============================================================================

export const darkTheme = {
  name: 'dark' as const,
  isDark: true,
  statusBar: 'light-content' as const,
  colors: darkColors,
  elevation: darkElevations,
} as const;

export type DarkTheme = typeof darkTheme;

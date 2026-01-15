/**
 * Light Theme Tokens
 *
 * Theme-specific remapping of semantic tokens for light mode.
 * This is the default theme for the app.
 *
 * Structure mirrors semantic tokens but with light-mode specific values.
 */

import { primitives } from '../primitive.tokens';

// =============================================================================
// LIGHT THEME COLOR TOKENS
// =============================================================================

export const lightColors = {
  bg: {
    /** Primary app background - pure white */
    primary: primitives.color.gray[0],
    /** Secondary/surface background - subtle gray */
    secondary: primitives.color.gray[50],
    /** Tertiary/nested background */
    tertiary: primitives.color.gray[100],
    /** Inverted background */
    inverse: primitives.color.gray[900],
    /** Overlay/backdrop */
    overlay: `rgba(0, 0, 0, ${primitives.opacity[50]})`,
    /** Disabled background */
    disabled: primitives.color.gray[100],
    /** Elevated surface (cards with shadow) */
    elevated: primitives.color.gray[0],
  },

  text: {
    /** Primary text - near black */
    primary: primitives.color.gray[900],
    /** Secondary text - medium gray */
    secondary: primitives.color.gray[500],
    /** Tertiary/placeholder text */
    tertiary: primitives.color.gray[400],
    /** Inverted text - white on dark */
    inverse: primitives.color.gray[0],
    /** Disabled text */
    disabled: primitives.color.gray[400],
    /** Link text */
    link: primitives.color.orange[500],
    /** Link active state */
    linkActive: primitives.color.orange[600],
  },

  interactive: {
    /** Primary brand action */
    primary: primitives.color.orange[500],
    /** Primary hover */
    primaryHover: primitives.color.orange[600],
    /** Primary pressed */
    primaryActive: primitives.color.orange[700],
    /** Secondary brand action */
    secondary: primitives.color.teal[500],
    /** Secondary hover */
    secondaryHover: primitives.color.teal[600],
    /** Secondary pressed */
    secondaryActive: primitives.color.teal[700],
    /** Subtle/ghost background */
    subtle: primitives.color.gray[100],
    /** Subtle hover */
    subtleHover: primitives.color.gray[200],
    /** Subtle pressed */
    subtleActive: primitives.color.gray[300],
    /** Disabled state */
    disabled: primitives.color.gray[300],
  },

  border: {
    /** Default border */
    default: primitives.color.gray[200],
    /** Strong border */
    strong: primitives.color.gray[300],
    /** Subtle border */
    subtle: primitives.color.gray[100],
    /** Focus ring */
    focus: primitives.color.orange[500],
    /** Divider lines */
    divider: primitives.color.gray[200],
    /** Disabled border */
    disabled: primitives.color.gray[200],
  },

  status: {
    /** Error/destructive */
    error: primitives.color.red[500],
    /** Error background */
    errorBg: primitives.color.red[50],
    /** Error border */
    errorBorder: primitives.color.red[200],
    /** Success/positive */
    success: primitives.color.green[500],
    /** Success background */
    successBg: primitives.color.green[50],
    /** Success border */
    successBorder: primitives.color.green[200],
    /** Warning/caution */
    warning: primitives.color.yellow[500],
    /** Warning background */
    warningBg: primitives.color.yellow[50],
    /** Warning border */
    warningBorder: primitives.color.yellow[200],
    /** Info/neutral */
    info: primitives.color.blue[500],
    /** Info background */
    infoBg: primitives.color.blue[50],
    /** Info border */
    infoBorder: primitives.color.blue[200],
  },
} as const;

// =============================================================================
// LIGHT THEME ELEVATION (with adjusted shadow colors)
// =============================================================================

export const lightElevations = {
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
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdown: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  overlay: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

// =============================================================================
// LIGHT THEME COMPLETE EXPORT
// =============================================================================

export const lightTheme = {
  name: 'light' as const,
  isDark: false,
  statusBar: 'dark-content' as const,
  colors: lightColors,
  elevation: lightElevations,
} as const;

export type LightTheme = typeof lightTheme;

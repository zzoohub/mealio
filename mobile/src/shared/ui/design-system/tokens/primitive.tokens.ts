/**
 * Primitive Tokens (Tier 1)
 *
 * Raw values only - NO semantic meaning.
 * These are the foundational values that semantic tokens reference.
 * NEVER use these directly in components - always use semantic tokens.
 *
 * @see https://tr.designtokens.org/format/ (W3C DTCG Format)
 */

// =============================================================================
// COLOR PRIMITIVES
// =============================================================================

export const colorPrimitives = {
  // Brand: Orange (Primary)
  orange: {
    50: '#FFF5F0',
    100: '#FFEADF',
    200: '#FFD5BF',
    300: '#FFBB9A',
    400: '#FF9A70',
    500: '#FF6B35', // Brand Primary
    600: '#E55A2B',
    700: '#CC4A22',
    800: '#A33A1B',
    900: '#7A2C14',
  },

  // Brand: Teal (Secondary)
  teal: {
    50: '#EDFCFB',
    100: '#D9F9F6',
    200: '#B3F2ED',
    300: '#8CEBE3',
    400: '#66E4D9',
    500: '#4ECDC4', // Brand Secondary
    600: '#3DB8B0',
    700: '#2DA39C',
    800: '#1E8E88',
    900: '#0F7974',
  },

  // Neutrals: Gray
  gray: {
    0: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
    1000: '#000000',
  },

  // Status: Green (Success)
  green: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#2ECC71', // Success
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Status: Red (Error)
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#E74C3C', // Error
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Status: Yellow/Amber (Warning)
  yellow: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F39C12', // Warning
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Status: Blue (Info)
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3498DB', // Info
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Transparent values
  transparent: 'transparent',
} as const;

// =============================================================================
// SPACING PRIMITIVES
// =============================================================================

/**
 * Spacing scale based on 4px increments
 * Values are in pixels (number type for React Native)
 */
export const spacingPrimitives = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

// =============================================================================
// TYPOGRAPHY PRIMITIVES
// =============================================================================

/**
 * Font size scale in pixels
 */
export const fontSizePrimitives = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

/**
 * Line height multipliers
 */
export const lineHeightPrimitives = {
  none: 1,
  tight: 1.2,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

/**
 * Font weights as string values (React Native compatible)
 */
export const fontWeightPrimitives = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Letter spacing in pixels
 */
export const letterSpacingPrimitives = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
} as const;

// =============================================================================
// BORDER RADIUS PRIMITIVES
// =============================================================================

/**
 * Border radius values in pixels
 */
export const radiusPrimitives = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// =============================================================================
// BORDER WIDTH PRIMITIVES
// =============================================================================

export const borderWidthPrimitives = {
  0: 0,
  1: 1,
  2: 2,
  4: 4,
} as const;

// =============================================================================
// OPACITY PRIMITIVES
// =============================================================================

export const opacityPrimitives = {
  0: 0,
  5: 0.05,
  10: 0.1,
  20: 0.2,
  25: 0.25,
  30: 0.3,
  40: 0.4,
  50: 0.5,
  60: 0.6,
  70: 0.7,
  75: 0.75,
  80: 0.8,
  90: 0.9,
  95: 0.95,
  100: 1,
} as const;

// =============================================================================
// ELEVATION / SHADOW PRIMITIVES
// =============================================================================

/**
 * Shadow presets for React Native
 * Each level includes iOS shadow properties and Android elevation
 */
export const elevationPrimitives = {
  none: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

// =============================================================================
// ANIMATION / EASING PRIMITIVES
// =============================================================================

/**
 * Animation duration in milliseconds
 */
export const durationPrimitives = {
  instant: 0,
  fastest: 50,
  faster: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
  slowest: 500,
  extra: 1000,
} as const;

/**
 * Easing curves as Bezier arrays [x1, y1, x2, y2]
 * Compatible with React Native Animated API
 */
export const easingPrimitives = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  // Material Design curves
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
  // iOS curves
  spring: [0.5, 1.5, 0.75, 1.25],
} as const;

// =============================================================================
// Z-INDEX PRIMITIVES
// =============================================================================

export const zIndexPrimitives = {
  hide: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
  max: 999,
} as const;

// =============================================================================
// EXPORT ALL PRIMITIVES
// =============================================================================

export const primitives = {
  color: colorPrimitives,
  spacing: spacingPrimitives,
  fontSize: fontSizePrimitives,
  lineHeight: lineHeightPrimitives,
  fontWeight: fontWeightPrimitives,
  letterSpacing: letterSpacingPrimitives,
  radius: radiusPrimitives,
  borderWidth: borderWidthPrimitives,
  opacity: opacityPrimitives,
  elevation: elevationPrimitives,
  duration: durationPrimitives,
  easing: easingPrimitives,
  zIndex: zIndexPrimitives,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ColorPrimitives = typeof colorPrimitives;
export type SpacingPrimitives = typeof spacingPrimitives;
export type FontSizePrimitives = typeof fontSizePrimitives;
export type LineHeightPrimitives = typeof lineHeightPrimitives;
export type FontWeightPrimitives = typeof fontWeightPrimitives;
export type LetterSpacingPrimitives = typeof letterSpacingPrimitives;
export type RadiusPrimitives = typeof radiusPrimitives;
export type BorderWidthPrimitives = typeof borderWidthPrimitives;
export type OpacityPrimitives = typeof opacityPrimitives;
export type ElevationPrimitives = typeof elevationPrimitives;
export type DurationPrimitives = typeof durationPrimitives;
export type EasingPrimitives = typeof easingPrimitives;
export type ZIndexPrimitives = typeof zIndexPrimitives;
export type Primitives = typeof primitives;

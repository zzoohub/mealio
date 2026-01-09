/**
 * Semantic Tokens (Tier 2)
 *
 * Intent-based tokens that reference primitives.
 * These convey PURPOSE and MEANING, not specific values.
 * USE THESE in components - never use primitives directly.
 *
 * Categories:
 * - color.bg.*        - Backgrounds
 * - color.text.*      - Typography colors
 * - color.interactive.* - Buttons, links, interactive elements
 * - color.border.*    - Borders and dividers
 * - color.status.*    - Feedback states
 * - spacing.component.* - Inside components (padding)
 * - spacing.layout.*  - Between sections (margin, gaps)
 *
 * @see https://tr.designtokens.org/format/ (W3C DTCG Format)
 */

import { primitives } from './primitive.tokens';

// =============================================================================
// SEMANTIC COLOR TOKENS
// =============================================================================

/**
 * Background colors by intent
 */
export const bgColors = {
  /** Primary app background */
  primary: primitives.color.gray[0],
  /** Secondary/surface background (cards, inputs) */
  secondary: primitives.color.gray[50],
  /** Tertiary/subtle background (nested sections) */
  tertiary: primitives.color.gray[100],
  /** Inverted background (dark on light, light on dark) */
  inverse: primitives.color.gray[900],
  /** Overlay/backdrop for modals */
  overlay: `rgba(0, 0, 0, ${primitives.opacity[50]})`,
  /** Disabled element background */
  disabled: primitives.color.gray[100],
  /** Elevated surface background */
  elevated: primitives.color.gray[0],
} as const;

/**
 * Text colors by intent
 */
export const textColors = {
  /** Primary readable text */
  primary: primitives.color.gray[900],
  /** Secondary/muted text */
  secondary: primitives.color.gray[500],
  /** Tertiary/subtle text (placeholders) */
  tertiary: primitives.color.gray[400],
  /** Inverted text (on dark backgrounds) */
  inverse: primitives.color.gray[0],
  /** Disabled text */
  disabled: primitives.color.gray[400],
  /** Link text */
  link: primitives.color.orange[500],
  /** Link text on hover/press */
  linkActive: primitives.color.orange[600],
} as const;

/**
 * Interactive element colors (buttons, links, etc.)
 */
export const interactiveColors = {
  /** Primary action color */
  primary: primitives.color.orange[500],
  /** Primary hover state */
  primaryHover: primitives.color.orange[600],
  /** Primary active/pressed state */
  primaryActive: primitives.color.orange[700],
  /** Secondary action color */
  secondary: primitives.color.teal[500],
  /** Secondary hover state */
  secondaryHover: primitives.color.teal[600],
  /** Secondary active/pressed state */
  secondaryActive: primitives.color.teal[700],
  /** Subtle/ghost interactive background */
  subtle: primitives.color.gray[100],
  /** Subtle hover state */
  subtleHover: primitives.color.gray[200],
  /** Subtle active/pressed state */
  subtleActive: primitives.color.gray[300],
  /** Disabled interactive state */
  disabled: primitives.color.gray[300],
} as const;

/**
 * Border colors by intent
 */
export const borderColors = {
  /** Default border (inputs, cards) */
  default: primitives.color.gray[200],
  /** Strong/emphasized border */
  strong: primitives.color.gray[300],
  /** Subtle/light border */
  subtle: primitives.color.gray[100],
  /** Focus ring border */
  focus: primitives.color.orange[500],
  /** Divider lines */
  divider: primitives.color.gray[200],
  /** Disabled border */
  disabled: primitives.color.gray[200],
} as const;

/**
 * Status/feedback colors
 */
export const statusColors = {
  /** Error/destructive */
  error: primitives.color.red[500],
  /** Error background (light) */
  errorBg: primitives.color.red[50],
  /** Error border */
  errorBorder: primitives.color.red[200],
  /** Success/positive */
  success: primitives.color.green[500],
  /** Success background (light) */
  successBg: primitives.color.green[50],
  /** Success border */
  successBorder: primitives.color.green[200],
  /** Warning/caution */
  warning: primitives.color.yellow[500],
  /** Warning background (light) */
  warningBg: primitives.color.yellow[50],
  /** Warning border */
  warningBorder: primitives.color.yellow[200],
  /** Info/neutral */
  info: primitives.color.blue[500],
  /** Info background (light) */
  infoBg: primitives.color.blue[50],
  /** Info border */
  infoBorder: primitives.color.blue[200],
} as const;

// =============================================================================
// SEMANTIC SPACING TOKENS
// =============================================================================

/**
 * Component spacing (padding inside components)
 */
export const componentSpacing = {
  /** Extra small - tight elements (tags, chips) */
  xs: primitives.spacing[1],  // 4px
  /** Small - compact elements */
  sm: primitives.spacing[2],  // 8px
  /** Medium - default component padding */
  md: primitives.spacing[3],  // 12px
  /** Large - spacious components */
  lg: primitives.spacing[4],  // 16px
  /** Extra large - hero sections in components */
  xl: primitives.spacing[6],  // 24px
  /** 2XL - very spacious */
  '2xl': primitives.spacing[8], // 32px
} as const;

/**
 * Layout spacing (gaps between sections, margins)
 */
export const layoutSpacing = {
  /** Extra small - tight groupings */
  xs: primitives.spacing[2],  // 8px
  /** Small - related items */
  sm: primitives.spacing[4],  // 16px
  /** Medium - default section gaps */
  md: primitives.spacing[6],  // 24px
  /** Large - major section separation */
  lg: primitives.spacing[8],  // 32px
  /** Extra large - page sections */
  xl: primitives.spacing[12], // 48px
  /** 2XL - major page divisions */
  '2xl': primitives.spacing[16], // 64px
} as const;

/**
 * Stack spacing (vertical rhythm between elements)
 */
export const stackSpacing = {
  /** Inline spacing (icon + text) */
  inline: primitives.spacing[2],  // 8px
  /** Related elements (label + input) */
  related: primitives.spacing[1], // 4px
  /** Grouped elements (form fields) */
  grouped: primitives.spacing[4], // 16px
  /** Section spacing */
  section: primitives.spacing[8], // 32px
} as const;

// =============================================================================
// SEMANTIC TYPOGRAPHY TOKENS
// =============================================================================

/**
 * Font sizes by semantic role
 */
export const fontSizes = {
  /** Caption/helper text */
  caption: primitives.fontSize.xs,     // 12px
  /** Body small */
  bodySmall: primitives.fontSize.sm,   // 14px
  /** Body default */
  body: primitives.fontSize.md,        // 16px
  /** Body large */
  bodyLarge: primitives.fontSize.lg,   // 18px
  /** Heading 4 (smallest heading) */
  h4: primitives.fontSize.lg,          // 18px
  /** Heading 3 */
  h3: primitives.fontSize.xl,          // 20px
  /** Heading 2 */
  h2: primitives.fontSize['2xl'],      // 24px
  /** Heading 1 (largest) */
  h1: primitives.fontSize['3xl'],      // 30px
  /** Display (hero text) */
  display: primitives.fontSize['4xl'], // 36px
} as const;

/**
 * Font weights by semantic role
 */
export const fontWeights = {
  /** Normal text */
  normal: primitives.fontWeight.regular,
  /** Emphasized text */
  medium: primitives.fontWeight.medium,
  /** Strong emphasis */
  semibold: primitives.fontWeight.semibold,
  /** Maximum emphasis */
  bold: primitives.fontWeight.bold,
} as const;

/**
 * Line heights by content type
 */
export const lineHeights = {
  /** Headings */
  heading: primitives.lineHeight.tight,
  /** Body text */
  body: primitives.lineHeight.normal,
  /** UI elements (buttons, inputs) */
  ui: primitives.lineHeight.snug,
} as const;

// =============================================================================
// SEMANTIC RADIUS TOKENS
// =============================================================================

export const radii = {
  /** No radius */
  none: primitives.radius.none,
  /** Subtle rounding (inputs, buttons) */
  sm: primitives.radius.sm,
  /** Default rounding (cards) */
  md: primitives.radius.md,
  /** Prominent rounding (modals, sheets) */
  lg: primitives.radius.lg,
  /** Very rounded (chips, tags) */
  xl: primitives.radius.xl,
  /** Fully rounded (avatars, icons) */
  full: primitives.radius.full,
} as const;

// =============================================================================
// SEMANTIC BORDER WIDTH TOKENS
// =============================================================================

export const borderWidths = {
  /** No border */
  none: primitives.borderWidth[0],
  /** Default border (inputs, cards) */
  default: primitives.borderWidth[1],
  /** Emphasized border */
  thick: primitives.borderWidth[2],
  /** Focus ring width */
  focus: primitives.borderWidth[2],
} as const;

// =============================================================================
// SEMANTIC OPACITY TOKENS
// =============================================================================

export const opacities = {
  /** Fully visible */
  visible: primitives.opacity[100],
  /** Hover state */
  hover: primitives.opacity[80],
  /** Pressed/active state */
  pressed: primitives.opacity[60],
  /** Disabled state */
  disabled: primitives.opacity[40],
  /** Overlay backdrop */
  overlay: primitives.opacity[50],
  /** Background wash */
  wash: primitives.opacity[10],
  /** Hidden */
  hidden: primitives.opacity[0],
} as const;

// =============================================================================
// SEMANTIC ELEVATION TOKENS
// =============================================================================

export const elevations = {
  /** Flat/no shadow */
  none: primitives.elevation.none,
  /** Subtle lift (hover cards) */
  raised: primitives.elevation.sm,
  /** Default card elevation */
  card: primitives.elevation.md,
  /** Dropdown/popover */
  dropdown: primitives.elevation.lg,
  /** Modal/dialog */
  modal: primitives.elevation.xl,
  /** Top-level overlay (toast, tooltip) */
  overlay: primitives.elevation['2xl'],
} as const;

// =============================================================================
// SEMANTIC ANIMATION TOKENS
// =============================================================================

export const durations = {
  /** Instant feedback (active states) */
  instant: primitives.duration.instant,
  /** Micro-interactions (hover, focus) */
  fast: primitives.duration.fast,
  /** Default transitions */
  normal: primitives.duration.normal,
  /** Page transitions, modals */
  slow: primitives.duration.slow,
  /** Complex animations */
  slower: primitives.duration.slowest,
} as const;

export const easings = {
  /** Linear movement */
  linear: primitives.easing.linear,
  /** Element entering */
  enter: primitives.easing.decelerate,
  /** Element exiting */
  exit: primitives.easing.accelerate,
  /** Standard movement */
  standard: primitives.easing.standard,
  /** Smooth transitions */
  smooth: primitives.easing.easeInOut,
} as const;

// =============================================================================
// SEMANTIC Z-INDEX TOKENS
// =============================================================================

export const zIndices = {
  /** Base layer */
  base: primitives.zIndex.base,
  /** Sticky elements */
  sticky: primitives.zIndex.sticky,
  /** Fixed elements (headers) */
  fixed: primitives.zIndex.fixed,
  /** Overlay backdrop */
  overlay: primitives.zIndex.overlay,
  /** Modal/dialog */
  modal: primitives.zIndex.modal,
  /** Popover/dropdown */
  popover: primitives.zIndex.popover,
  /** Toast notifications */
  toast: primitives.zIndex.toast,
  /** Tooltips */
  tooltip: primitives.zIndex.tooltip,
} as const;

// =============================================================================
// COMPONENT SIZE TOKENS
// =============================================================================

/**
 * Touch target sizes (accessibility minimum 44px)
 */
export const touchTargets = {
  /** Minimum touch target */
  min: 44,
  /** Small touch target */
  sm: 36,
  /** Default touch target */
  md: 44,
  /** Large touch target */
  lg: 48,
  /** Extra large touch target */
  xl: 56,
} as const;

/**
 * Icon sizes
 */
export const iconSizes = {
  /** Extra small icons */
  xs: 16,
  /** Small icons */
  sm: 20,
  /** Default icons */
  md: 24,
  /** Large icons */
  lg: 32,
  /** Extra large icons */
  xl: 40,
} as const;

// =============================================================================
// EXPORT ALL SEMANTIC TOKENS
// =============================================================================

export const semanticTokens = {
  color: {
    bg: bgColors,
    text: textColors,
    interactive: interactiveColors,
    border: borderColors,
    status: statusColors,
  },
  spacing: {
    component: componentSpacing,
    layout: layoutSpacing,
    stack: stackSpacing,
  },
  typography: {
    fontSize: fontSizes,
    fontWeight: fontWeights,
    lineHeight: lineHeights,
  },
  radius: radii,
  borderWidth: borderWidths,
  opacity: opacities,
  elevation: elevations,
  duration: durations,
  easing: easings,
  zIndex: zIndices,
  size: {
    touchTarget: touchTargets,
    icon: iconSizes,
  },
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type BgColors = typeof bgColors;
export type TextColors = typeof textColors;
export type InteractiveColors = typeof interactiveColors;
export type BorderColors = typeof borderColors;
export type StatusColors = typeof statusColors;
export type ComponentSpacing = typeof componentSpacing;
export type LayoutSpacing = typeof layoutSpacing;
export type StackSpacing = typeof stackSpacing;
export type FontSizes = typeof fontSizes;
export type FontWeights = typeof fontWeights;
export type LineHeights = typeof lineHeights;
export type Radii = typeof radii;
export type BorderWidths = typeof borderWidths;
export type Opacities = typeof opacities;
export type Elevations = typeof elevations;
export type Durations = typeof durations;
export type Easings = typeof easings;
export type ZIndices = typeof zIndices;
export type TouchTargets = typeof touchTargets;
export type IconSizes = typeof iconSizes;
export type SemanticTokens = typeof semanticTokens;

/**
 * Design System Tokens
 *
 * Central export for the complete token architecture.
 *
 * Token Hierarchy (W3C DTCG Format):
 *
 * Tier 1: Primitives     - Raw values, NO semantic meaning
 *                         NEVER use directly in components
 *
 * Tier 2: Semantic       - Intent-based tokens, references primitives
 *                         USE THESE in components
 *
 * Tier 3: Theme          - Theme-specific overrides of semantic tokens
 *                         Used via ThemeProvider context
 *
 * @example
 * // In components, use semantic tokens:
 * import { tokens } from '@/design-system/tokens';
 *
 * const styles = StyleSheet.create({
 *   container: {
 *     padding: tokens.spacing.component.md,
 *     borderRadius: tokens.radius.md,
 *   },
 * });
 *
 * // For themed colors, use theme context:
 * import { useTheme } from '@/design-system/theme';
 *
 * function MyComponent() {
 *   const { colors } = useTheme();
 *   return <View style={{ backgroundColor: colors.bg.primary }} />;
 * }
 */

// =============================================================================
// PRIMITIVE TOKENS (Tier 1)
// =============================================================================

export {
  primitives,
  colorPrimitives,
  spacingPrimitives,
  fontSizePrimitives,
  lineHeightPrimitives,
  fontWeightPrimitives,
  letterSpacingPrimitives,
  radiusPrimitives,
  borderWidthPrimitives,
  opacityPrimitives,
  elevationPrimitives,
  durationPrimitives,
  easingPrimitives,
  zIndexPrimitives,
} from './primitive.tokens';

export type {
  Primitives,
  ColorPrimitives,
  SpacingPrimitives,
  FontSizePrimitives,
  LineHeightPrimitives,
  FontWeightPrimitives,
  LetterSpacingPrimitives,
  RadiusPrimitives,
  BorderWidthPrimitives,
  OpacityPrimitives,
  ElevationPrimitives,
  DurationPrimitives,
  EasingPrimitives,
  ZIndexPrimitives,
} from './primitive.tokens';

// =============================================================================
// SEMANTIC TOKENS (Tier 2)
// =============================================================================

export {
  semanticTokens,
  bgColors,
  textColors,
  interactiveColors,
  borderColors,
  statusColors,
  componentSpacing,
  layoutSpacing,
  stackSpacing,
  fontSizes,
  fontWeights,
  lineHeights,
  radii,
  borderWidths,
  opacities,
  elevations,
  durations,
  easings,
  zIndices,
  touchTargets,
  iconSizes,
} from './semantic.tokens';

export type {
  SemanticTokens,
  BgColors,
  TextColors,
  InteractiveColors,
  BorderColors,
  StatusColors,
  ComponentSpacing,
  LayoutSpacing,
  StackSpacing,
  FontSizes,
  FontWeights,
  LineHeights,
  Radii,
  BorderWidths,
  Opacities,
  Elevations,
  Durations,
  Easings,
  ZIndices,
  TouchTargets,
  IconSizes,
} from './semantic.tokens';

// =============================================================================
// THEME TOKENS (Tier 3)
// =============================================================================

export {
  themes,
  lightTheme,
  darkTheme,
  lightColors,
  darkColors,
  lightElevations,
  darkElevations,
  defaultTheme,
  getTheme,
} from './themes';

export type {
  Theme,
  ThemeName,
  ThemeColors,
  ThemeElevation,
  LightTheme,
  DarkTheme,
} from './themes';

// =============================================================================
// CONVENIENCE EXPORT: TOKENS
// =============================================================================

import { semanticTokens } from './semantic.tokens';
import { primitives } from './primitive.tokens';

/**
 * Main tokens object for component usage.
 *
 * Contains all semantic tokens that should be used in components.
 * For theme-specific colors, use the useTheme() hook instead.
 *
 * @example
 * import { tokens } from '@/design-system/tokens';
 *
 * const styles = StyleSheet.create({
 *   button: {
 *     paddingHorizontal: tokens.spacing.component.lg,
 *     paddingVertical: tokens.spacing.component.md,
 *     borderRadius: tokens.radius.md,
 *     minHeight: tokens.size.touchTarget.md,
 *   },
 *   text: {
 *     fontSize: tokens.typography.fontSize.body,
 *     fontWeight: tokens.typography.fontWeight.semibold,
 *     lineHeight: tokens.typography.fontSize.body * tokens.typography.lineHeight.ui,
 *   },
 * });
 */
export const tokens = {
  ...semanticTokens,
  // Also expose primitives for edge cases (but prefer semantic tokens)
  primitives,
} as const;

export type Tokens = typeof tokens;

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Extract keys from a token category
 */
export type TokenKeys<T> = T extends Record<string, unknown> ? keyof T : never;

/**
 * Spacing size keys
 */
export type SpacingSize = TokenKeys<typeof semanticTokens.spacing.component>;

/**
 * Radius size keys
 */
export type RadiusSize = TokenKeys<typeof semanticTokens.radius>;

/**
 * Font size keys
 */
export type FontSize = TokenKeys<typeof semanticTokens.typography.fontSize>;

/**
 * Font weight keys
 */
export type FontWeight = TokenKeys<typeof semanticTokens.typography.fontWeight>;

/**
 * Elevation level keys
 */
export type ElevationLevel = TokenKeys<typeof semanticTokens.elevation>;

/**
 * Z-index level keys
 */
export type ZIndexLevel = TokenKeys<typeof semanticTokens.zIndex>;

/**
 * Duration keys
 */
export type Duration = TokenKeys<typeof semanticTokens.duration>;

/**
 * Icon size keys
 */
export type IconSize = TokenKeys<typeof semanticTokens.size.icon>;

/**
 * Touch target size keys
 */
export type TouchTargetSize = TokenKeys<typeof semanticTokens.size.touchTarget>;

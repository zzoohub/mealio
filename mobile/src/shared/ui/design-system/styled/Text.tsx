/**
 * Text - Typography primitive component
 *
 * A foundational text component that maps design token-based props
 * to React Native Text styles. Use Text for all typography needs.
 *
 * @example
 * ```tsx
 * <Text variant="h1">Heading 1</Text>
 *
 * <Text variant="body" color="secondary">
 *   Secondary body text
 * </Text>
 *
 * <Text variant="caption" align="center" weight="semibold">
 *   Centered caption with semibold weight
 * </Text>
 *
 * <Text variant="body" numberOfLines={2}>
 *   Long text that will be truncated after 2 lines...
 * </Text>
 * ```
 */

import React from 'react';
import {
  Text as RNText,
  type TextStyle,
  type TextProps as RNTextProps,
} from 'react-native';
import { tokens } from '../tokens';
import { createStyles, useStyles } from '../theme';

// =============================================================================
// TYPES
// =============================================================================

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'disabled'
  | 'link'
  | 'error'
  | 'success'
  | 'warning';

export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  /** Text content */
  children?: React.ReactNode;
  /** Typography variant */
  variant?: TextVariant;
  /** Text color */
  color?: TextColor;
  /** Font weight override */
  weight?: TextWeight;
  /** Text alignment */
  align?: TextAlign;
  /** Italic text */
  italic?: boolean;
  /** Underline text */
  underline?: boolean;
  /** Strike through text */
  strikethrough?: boolean;
  /** Uppercase text */
  uppercase?: boolean;
  /** Lowercase text */
  lowercase?: boolean;
  /** Capitalize text */
  capitalize?: boolean;
  /** Letter spacing */
  tracking?: 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
  /** Custom style */
  style?: TextStyle;
  /** Test ID */
  testID?: string;
}

// =============================================================================
// VARIANT CONFIGURATIONS
// =============================================================================

interface VariantConfig {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
}

function getVariantConfig(variant: TextVariant): VariantConfig {
  switch (variant) {
    case 'display':
      return {
        fontSize: tokens.typography.fontSize.display,
        fontWeight: tokens.typography.fontWeight.bold,
        lineHeight: tokens.typography.fontSize.display * tokens.typography.lineHeight.heading,
      };
    case 'h1':
      return {
        fontSize: tokens.typography.fontSize.h1,
        fontWeight: tokens.typography.fontWeight.bold,
        lineHeight: tokens.typography.fontSize.h1 * tokens.typography.lineHeight.heading,
      };
    case 'h2':
      return {
        fontSize: tokens.typography.fontSize.h2,
        fontWeight: tokens.typography.fontWeight.semibold,
        lineHeight: tokens.typography.fontSize.h2 * tokens.typography.lineHeight.heading,
      };
    case 'h3':
      return {
        fontSize: tokens.typography.fontSize.h3,
        fontWeight: tokens.typography.fontWeight.semibold,
        lineHeight: tokens.typography.fontSize.h3 * tokens.typography.lineHeight.heading,
      };
    case 'h4':
      return {
        fontSize: tokens.typography.fontSize.h4,
        fontWeight: tokens.typography.fontWeight.semibold,
        lineHeight: tokens.typography.fontSize.h4 * tokens.typography.lineHeight.heading,
      };
    case 'bodyLarge':
      return {
        fontSize: tokens.typography.fontSize.bodyLarge,
        fontWeight: tokens.typography.fontWeight.normal,
        lineHeight: tokens.typography.fontSize.bodyLarge * tokens.typography.lineHeight.body,
      };
    case 'body':
      return {
        fontSize: tokens.typography.fontSize.body,
        fontWeight: tokens.typography.fontWeight.normal,
        lineHeight: tokens.typography.fontSize.body * tokens.typography.lineHeight.body,
      };
    case 'bodySmall':
      return {
        fontSize: tokens.typography.fontSize.bodySmall,
        fontWeight: tokens.typography.fontWeight.normal,
        lineHeight: tokens.typography.fontSize.bodySmall * tokens.typography.lineHeight.body,
      };
    case 'caption':
      return {
        fontSize: tokens.typography.fontSize.caption,
        fontWeight: tokens.typography.fontWeight.normal,
        lineHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.body,
      };
    case 'label':
      return {
        fontSize: tokens.typography.fontSize.bodySmall,
        fontWeight: tokens.typography.fontWeight.medium,
        lineHeight: tokens.typography.fontSize.bodySmall * tokens.typography.lineHeight.ui,
      };
    default:
      return {
        fontSize: tokens.typography.fontSize.body,
        fontWeight: tokens.typography.fontWeight.normal,
        lineHeight: tokens.typography.fontSize.body * tokens.typography.lineHeight.body,
      };
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Text({
  children,
  variant = 'body',
  color = 'primary',
  weight,
  align,
  italic,
  underline,
  strikethrough,
  uppercase,
  lowercase,
  capitalize,
  tracking,
  style,
  testID,
  ...textProps
}: TextProps) {
  const s = useStyles(styles);

  // Get variant configuration
  const variantConfig = getVariantConfig(variant);

  // Get color style
  const getColorStyle = () => {
    const colorKey = `color${color.charAt(0).toUpperCase() + color.slice(1)}` as keyof typeof s;
    return s[colorKey] || s.colorPrimary;
  };

  // Build computed styles
  const computedStyle: TextStyle = {
    fontSize: variantConfig.fontSize,
    fontWeight: weight
      ? tokens.typography.fontWeight[weight]
      : (variantConfig.fontWeight as TextStyle['fontWeight']),
    lineHeight: variantConfig.lineHeight,
    ...(getColorStyle() as TextStyle),
  };

  // Text alignment
  if (align) computedStyle.textAlign = align;

  // Font style
  if (italic) computedStyle.fontStyle = 'italic';

  // Text decoration
  const decorations: string[] = [];
  if (underline) decorations.push('underline');
  if (strikethrough) decorations.push('line-through');
  if (decorations.length > 0) {
    computedStyle.textDecorationLine = decorations.join(' ') as TextStyle['textDecorationLine'];
  }

  // Text transform
  if (uppercase) computedStyle.textTransform = 'uppercase';
  if (lowercase) computedStyle.textTransform = 'lowercase';
  if (capitalize) computedStyle.textTransform = 'capitalize';

  // Letter spacing
  if (tracking) {
    const letterSpacingValues = {
      tighter: -0.8,
      tight: -0.4,
      normal: 0,
      wide: 0.4,
      wider: 0.8,
      widest: 1.6,
    };
    computedStyle.letterSpacing = letterSpacingValues[tracking];
  }

  return (
    <RNText testID={testID} style={[computedStyle, style]} {...textProps}>
      {children}
    </RNText>
  );
}

export default Text;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  // Text colors
  colorPrimary: { color: colors.text.primary },
  colorSecondary: { color: colors.text.secondary },
  colorTertiary: { color: colors.text.tertiary },
  colorInverse: { color: colors.text.inverse },
  colorDisabled: { color: colors.text.disabled },
  colorLink: { color: colors.text.link },
  colorError: { color: colors.status.error },
  colorSuccess: { color: colors.status.success },
  colorWarning: { color: colors.status.warning },
}));

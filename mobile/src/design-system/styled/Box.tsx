/**
 * Box - Layout primitive component
 *
 * A foundational layout component that maps design token-based props
 * to React Native View styles. Use Box as the building block for layouts.
 *
 * @example
 * ```tsx
 * <Box p="lg" bg="secondary" radius="md">
 *   <Text>Content with padding and background</Text>
 * </Box>
 *
 * <Box px="md" py="sm" borderWidth="default" borderColor="default">
 *   <Text>Box with border</Text>
 * </Box>
 *
 * <Box flex={1} center>
 *   <Text>Centered content</Text>
 * </Box>
 * ```
 */

import React from 'react';
import { View, type ViewStyle, type ViewProps, type DimensionValue } from 'react-native';
import { tokens } from '../tokens';
import { createStyles, useStyles } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export type SpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type RadiusSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type BgColor = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'elevated' | 'disabled' | 'transparent';
export type BorderColor = 'default' | 'strong' | 'subtle' | 'focus' | 'divider' | 'disabled';
export type BorderWidth = 'none' | 'default' | 'thick';
export type ElevationLevel = 'none' | 'raised' | 'card' | 'dropdown' | 'modal' | 'overlay';

export interface BoxProps extends ViewProps {
  /** Children */
  children?: React.ReactNode;

  // Spacing props
  /** Padding all sides */
  p?: SpacingSize;
  /** Padding horizontal */
  px?: SpacingSize;
  /** Padding vertical */
  py?: SpacingSize;
  /** Padding top */
  pt?: SpacingSize;
  /** Padding right */
  pr?: SpacingSize;
  /** Padding bottom */
  pb?: SpacingSize;
  /** Padding left */
  pl?: SpacingSize;
  /** Margin all sides */
  m?: SpacingSize;
  /** Margin horizontal */
  mx?: SpacingSize;
  /** Margin vertical */
  my?: SpacingSize;
  /** Margin top */
  mt?: SpacingSize;
  /** Margin right */
  mr?: SpacingSize;
  /** Margin bottom */
  mb?: SpacingSize;
  /** Margin left */
  ml?: SpacingSize;
  /** Gap between children */
  gap?: SpacingSize;

  // Background
  /** Background color */
  bg?: BgColor;

  // Border
  /** Border radius */
  radius?: RadiusSize;
  /** Border width */
  borderWidth?: BorderWidth;
  /** Border color */
  borderColor?: BorderColor;

  // Elevation
  /** Shadow/elevation level */
  elevation?: ElevationLevel;

  // Flex
  /** Flex value */
  flex?: number;
  /** Flex direction */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  /** Justify content */
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  /** Align items */
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  /** Align self */
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  /** Flex wrap */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  /** Center content (shorthand for justify="center" align="center") */
  center?: boolean;

  // Sizing
  /** Width */
  width?: number | string;
  /** Height */
  height?: number | string;
  /** Min width */
  minWidth?: number | string;
  /** Min height */
  minHeight?: number | string;
  /** Max width */
  maxWidth?: number | string;
  /** Max height */
  maxHeight?: number | string;

  // Positioning
  /** Position type */
  position?: 'relative' | 'absolute';
  /** Top */
  top?: number;
  /** Right */
  right?: number;
  /** Bottom */
  bottom?: number;
  /** Left */
  left?: number;
  /** Z-index */
  zIndex?: number;

  // Other
  /** Overflow */
  overflow?: 'visible' | 'hidden' | 'scroll';
  /** Opacity */
  opacity?: number;

  /** Custom style */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getSpacing(size?: SpacingSize): number | undefined {
  if (!size) return undefined;
  return tokens.spacing.component[size];
}

function getRadius(size?: RadiusSize): number | undefined {
  if (!size) return undefined;
  return tokens.radius[size];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Box({
  children,
  // Spacing
  p,
  px,
  py,
  pt,
  pr,
  pb,
  pl,
  m,
  mx,
  my,
  mt,
  mr,
  mb,
  ml,
  gap,
  // Background
  bg,
  // Border
  radius,
  borderWidth,
  borderColor,
  // Elevation
  elevation,
  // Flex
  flex,
  direction,
  justify,
  align,
  alignSelf,
  wrap,
  center,
  // Sizing
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  // Positioning
  position,
  top,
  right,
  bottom,
  left,
  zIndex,
  // Other
  overflow,
  opacity,
  // Style
  style,
  testID,
  ...viewProps
}: BoxProps) {
  const s = useStyles(styles);

  // Build computed styles
  const computedStyle: ViewStyle = {};

  // Padding
  if (p !== undefined) computedStyle.padding = getSpacing(p);
  if (px !== undefined) computedStyle.paddingHorizontal = getSpacing(px);
  if (py !== undefined) computedStyle.paddingVertical = getSpacing(py);
  if (pt !== undefined) computedStyle.paddingTop = getSpacing(pt);
  if (pr !== undefined) computedStyle.paddingRight = getSpacing(pr);
  if (pb !== undefined) computedStyle.paddingBottom = getSpacing(pb);
  if (pl !== undefined) computedStyle.paddingLeft = getSpacing(pl);

  // Margin
  if (m !== undefined) computedStyle.margin = getSpacing(m);
  if (mx !== undefined) computedStyle.marginHorizontal = getSpacing(mx);
  if (my !== undefined) computedStyle.marginVertical = getSpacing(my);
  if (mt !== undefined) computedStyle.marginTop = getSpacing(mt);
  if (mr !== undefined) computedStyle.marginRight = getSpacing(mr);
  if (mb !== undefined) computedStyle.marginBottom = getSpacing(mb);
  if (ml !== undefined) computedStyle.marginLeft = getSpacing(ml);

  // Gap
  if (gap !== undefined) computedStyle.gap = getSpacing(gap);

  // Background
  if (bg !== undefined && bg !== 'transparent') {
    const bgStyleKey = `bg${bg.charAt(0).toUpperCase() + bg.slice(1)}` as keyof typeof s;
    if (s[bgStyleKey]) {
      Object.assign(computedStyle, s[bgStyleKey]);
    }
  } else if (bg === 'transparent') {
    computedStyle.backgroundColor = 'transparent';
  }

  // Border
  if (radius !== undefined) computedStyle.borderRadius = getRadius(radius);
  if (borderWidth !== undefined) {
    computedStyle.borderWidth = tokens.borderWidth[borderWidth];
  }
  if (borderColor !== undefined) {
    const borderStyleKey = `border${borderColor.charAt(0).toUpperCase() + borderColor.slice(1)}` as keyof typeof s;
    if (s[borderStyleKey]) {
      Object.assign(computedStyle, s[borderStyleKey]);
    }
  }

  // Elevation
  if (elevation !== undefined) {
    const elevationStyleKey = `elevation${elevation.charAt(0).toUpperCase() + elevation.slice(1)}` as keyof typeof s;
    if (s[elevationStyleKey]) {
      Object.assign(computedStyle, s[elevationStyleKey]);
    }
  }

  // Flex
  if (flex !== undefined) computedStyle.flex = flex;
  if (direction !== undefined) computedStyle.flexDirection = direction;
  if (justify !== undefined) computedStyle.justifyContent = justify;
  if (align !== undefined) computedStyle.alignItems = align;
  if (alignSelf !== undefined) computedStyle.alignSelf = alignSelf;
  if (wrap !== undefined) computedStyle.flexWrap = wrap;
  if (center) {
    computedStyle.justifyContent = 'center';
    computedStyle.alignItems = 'center';
  }

  // Sizing
  if (width !== undefined) computedStyle.width = width as DimensionValue;
  if (height !== undefined) computedStyle.height = height as DimensionValue;
  if (minWidth !== undefined) computedStyle.minWidth = minWidth as DimensionValue;
  if (minHeight !== undefined) computedStyle.minHeight = minHeight as DimensionValue;
  if (maxWidth !== undefined) computedStyle.maxWidth = maxWidth as DimensionValue;
  if (maxHeight !== undefined) computedStyle.maxHeight = maxHeight as DimensionValue;

  // Positioning
  if (position !== undefined) computedStyle.position = position;
  if (top !== undefined) computedStyle.top = top;
  if (right !== undefined) computedStyle.right = right;
  if (bottom !== undefined) computedStyle.bottom = bottom;
  if (left !== undefined) computedStyle.left = left;
  if (zIndex !== undefined) computedStyle.zIndex = zIndex;

  // Other
  if (overflow !== undefined) computedStyle.overflow = overflow;
  if (opacity !== undefined) computedStyle.opacity = opacity;

  return (
    <View testID={testID} style={[computedStyle, style]} {...viewProps}>
      {children}
    </View>
  );
}

export default Box;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors, { elevation }) => ({
  // Background colors
  bgPrimary: { backgroundColor: colors.bg.primary },
  bgSecondary: { backgroundColor: colors.bg.secondary },
  bgTertiary: { backgroundColor: colors.bg.tertiary },
  bgInverse: { backgroundColor: colors.bg.inverse },
  bgElevated: { backgroundColor: colors.bg.elevated },
  bgDisabled: { backgroundColor: colors.bg.disabled },
  // Border colors
  borderDefault: { borderColor: colors.border.default },
  borderStrong: { borderColor: colors.border.strong },
  borderSubtle: { borderColor: colors.border.subtle },
  borderFocus: { borderColor: colors.border.focus },
  borderDivider: { borderColor: colors.border.divider },
  borderDisabled: { borderColor: colors.border.disabled },
  // Elevations
  elevationNone: elevation.none,
  elevationRaised: elevation.raised,
  elevationCard: elevation.card,
  elevationDropdown: elevation.dropdown,
  elevationModal: elevation.modal,
  elevationOverlay: elevation.overlay,
}));

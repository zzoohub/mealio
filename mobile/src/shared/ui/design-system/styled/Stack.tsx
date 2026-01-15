/**
 * Stack - Flex layout primitive component
 *
 * A convenience component for creating flex layouts with consistent spacing.
 * Stack handles direction, gap, and alignment in a declarative way.
 *
 * @example
 * ```tsx
 * // Vertical stack (default)
 * <Stack gap="md">
 *   <Text>Item 1</Text>
 *   <Text>Item 2</Text>
 *   <Text>Item 3</Text>
 * </Stack>
 *
 * // Horizontal stack
 * <Stack direction="horizontal" gap="sm" align="center">
 *   <Icon name="star" />
 *   <Text>Rating: 4.5</Text>
 * </Stack>
 *
 * // Centered stack
 * <Stack flex={1} align="center" justify="center">
 *   <Text>Centered content</Text>
 * </Stack>
 * ```
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type ViewProps } from 'react-native';
import { tokens } from '../tokens';
import { createStyles, useStyles } from '../theme';

// =============================================================================
// TYPES
// =============================================================================

export type StackDirection = 'vertical' | 'horizontal';
export type StackGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

export interface StackProps extends ViewProps {
  /** Children */
  children?: React.ReactNode;
  /** Stack direction */
  direction?: StackDirection;
  /** Gap between children */
  gap?: StackGap;
  /** Align items (cross axis) */
  align?: StackAlign;
  /** Justify content (main axis) */
  justify?: StackJustify;
  /** Whether to wrap children */
  wrap?: boolean;
  /** Flex value */
  flex?: number;
  /** Padding */
  padding?: StackGap;
  /** Padding horizontal */
  paddingX?: StackGap;
  /** Padding vertical */
  paddingY?: StackGap;
  /** Whether to fill available space */
  fill?: boolean;
  /** Reverse the direction */
  reverse?: boolean;
  /** Custom style */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getGap(size?: StackGap): number {
  if (!size || size === 'none') return 0;
  return tokens.spacing.component[size];
}

function getFlexDirection(
  direction: StackDirection,
  reverse: boolean
): ViewStyle['flexDirection'] {
  if (direction === 'horizontal') {
    return reverse ? 'row-reverse' : 'row';
  }
  return reverse ? 'column-reverse' : 'column';
}

function getAlignItems(align?: StackAlign): ViewStyle['alignItems'] {
  switch (align) {
    case 'start':
      return 'flex-start';
    case 'end':
      return 'flex-end';
    case 'center':
      return 'center';
    case 'stretch':
      return 'stretch';
    case 'baseline':
      return 'baseline';
    default:
      return undefined;
  }
}

function getJustifyContent(justify?: StackJustify): ViewStyle['justifyContent'] {
  switch (justify) {
    case 'start':
      return 'flex-start';
    case 'end':
      return 'flex-end';
    case 'center':
      return 'center';
    case 'space-between':
      return 'space-between';
    case 'space-around':
      return 'space-around';
    case 'space-evenly':
      return 'space-evenly';
    default:
      return undefined;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Stack({
  children,
  direction = 'vertical',
  gap = 'none',
  align,
  justify,
  wrap = false,
  flex,
  padding,
  paddingX,
  paddingY,
  fill = false,
  reverse = false,
  style,
  testID,
  ...viewProps
}: StackProps) {
  // Build computed styles
  const computedStyle: ViewStyle = {
    flexDirection: getFlexDirection(direction, reverse),
    gap: getGap(gap),
  };

  // Alignment
  const alignItems = getAlignItems(align);
  if (alignItems) computedStyle.alignItems = alignItems;

  const justifyContent = getJustifyContent(justify);
  if (justifyContent) computedStyle.justifyContent = justifyContent;

  // Wrap
  if (wrap) computedStyle.flexWrap = 'wrap';

  // Flex
  if (flex !== undefined) computedStyle.flex = flex;
  if (fill) computedStyle.flex = 1;

  // Padding
  if (padding) computedStyle.padding = getGap(padding);
  if (paddingX) computedStyle.paddingHorizontal = getGap(paddingX);
  if (paddingY) computedStyle.paddingVertical = getGap(paddingY);

  return (
    <View testID={testID} style={[computedStyle, style]} {...viewProps}>
      {children}
    </View>
  );
}

// =============================================================================
// CONVENIENCE COMPONENTS
// =============================================================================

/**
 * HStack - Horizontal Stack
 *
 * Convenience component for horizontal stacks.
 *
 * @example
 * ```tsx
 * <HStack gap="sm" align="center">
 *   <Icon name="heart" />
 *   <Text>Favorites</Text>
 * </HStack>
 * ```
 */
export function HStack(props: Omit<StackProps, 'direction'>) {
  return <Stack direction="horizontal" {...props} />;
}

/**
 * VStack - Vertical Stack
 *
 * Convenience component for vertical stacks.
 *
 * @example
 * ```tsx
 * <VStack gap="md">
 *   <Text variant="h2">Title</Text>
 *   <Text>Description</Text>
 * </VStack>
 * ```
 */
export function VStack(props: Omit<StackProps, 'direction'>) {
  return <Stack direction="vertical" {...props} />;
}

/**
 * Center - Centered Stack
 *
 * Convenience component for centering content.
 *
 * @example
 * ```tsx
 * <Center flex={1}>
 *   <ActivityIndicator />
 *   <Text>Loading...</Text>
 * </Center>
 * ```
 */
export interface CenterProps extends Omit<StackProps, 'align' | 'justify'> {
  /** Center only horizontally (for horizontal direction) or vertically (for vertical direction) */
  axis?: 'main' | 'cross' | 'both';
}

export function Center({ axis = 'both', direction = 'vertical', ...props }: CenterProps) {
  const alignValue = axis === 'cross' || axis === 'both' ? 'center' : undefined;
  const justifyValue = axis === 'main' || axis === 'both' ? 'center' : undefined;

  return (
    <Stack
      direction={direction}
      {...(alignValue && { align: alignValue })}
      {...(justifyValue && { justify: justifyValue })}
      {...props}
    />
  );
}

/**
 * Spacer - Flexible spacer component
 *
 * Takes up available space in a Stack.
 *
 * @example
 * ```tsx
 * <HStack>
 *   <Text>Left</Text>
 *   <Spacer />
 *   <Text>Right</Text>
 * </HStack>
 * ```
 */
export interface SpacerProps {
  /** Fixed size instead of flex */
  size?: StackGap;
}

export function Spacer({ size }: SpacerProps) {
  if (size) {
    return <View style={{ width: getGap(size), height: getGap(size) }} />;
  }
  return <View style={{ flex: 1 }} />;
}

/**
 * Divider - Visual separator component
 *
 * A thin line to separate content in a Stack.
 *
 * @example
 * ```tsx
 * <VStack>
 *   <ListItem title="Item 1" />
 *   <Divider />
 *   <ListItem title="Item 2" />
 * </VStack>
 * ```
 */
export interface DividerProps {
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Inset from edges */
  inset?: StackGap;
  /** Custom style */
  style?: ViewStyle;
}

export function Divider({ orientation = 'horizontal', inset, style }: DividerProps) {
  const s = useStyles(styles);

  const insetValue = inset ? getGap(inset) : 0;

  const dividerStyle: ViewStyle =
    orientation === 'horizontal'
      ? {
          height: StyleSheet.hairlineWidth,
          marginHorizontal: insetValue,
        }
      : {
          width: StyleSheet.hairlineWidth,
          marginVertical: insetValue,
        };

  return <View style={[s.divider, dividerStyle, style]} />;
}

export default Stack;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  divider: {
    backgroundColor: colors.border.divider,
  },
}));

/**
 * Mealio Design System - Styled Components
 *
 * This module exports styled components that combine headless hooks
 * with design tokens. These are the primary UI components for the app.
 *
 * Component Categories:
 *
 * 1. Interactive Components
 *    - Button: Action buttons with variants and color schemes
 *    - Input: Text input with label, error, and icon support
 *    - Toggle: On/off switch with animated thumb
 *    - Checkbox: Selection control with animated check
 *
 * 2. Container Components
 *    - Card: Container with compound components (Header, Content, Footer)
 *    - ListItem: List row with leading/trailing content
 *
 * 3. Primitives
 *    - Box: Layout primitive with token-based props
 *    - Text: Typography primitive with variants
 *    - Stack: Flex layout with gap and alignment
 *    - HStack, VStack, Center: Convenience stack variants
 *    - Spacer: Flexible space filler
 *    - Divider: Visual separator
 *
 * @example
 * ```tsx
 * import {
 *   Button,
 *   Card,
 *   Input,
 *   Toggle,
 *   Checkbox,
 *   ListItem,
 *   Box,
 *   Text,
 *   Stack,
 *   HStack,
 *   VStack,
 * } from '@/design-system/styled';
 *
 * function MyScreen() {
 *   return (
 *     <VStack gap="md" padding="lg">
 *       <Card variant="elevated">
 *         <Card.Header>
 *           <Card.Title>Welcome</Card.Title>
 *         </Card.Header>
 *         <Card.Content>
 *           <Input label="Email" placeholder="Enter email" />
 *         </Card.Content>
 *         <Card.Footer>
 *           <Button variant="solid" colorScheme="primary">
 *             Continue
 *           </Button>
 *         </Card.Footer>
 *       </Card>
 *     </VStack>
 *   );
 * }
 * ```
 */

// =============================================================================
// INTERACTIVE COMPONENTS
// =============================================================================

export { Button, default as ButtonDefault } from './Button';
export type {
  ButtonProps,
  ButtonVariant,
  ButtonColorScheme,
  ButtonSize,
} from './Button';

export { Input, default as InputDefault } from './Input';
export type { InputProps, InputVariant, InputRef } from './Input';

export { Toggle, default as ToggleDefault } from './Toggle';
export type { ToggleProps, ToggleSize, ToggleColorScheme } from './Toggle';

export { Checkbox, default as CheckboxDefault } from './Checkbox';
export type { CheckboxProps, CheckboxSize, CheckboxColorScheme } from './Checkbox';

// =============================================================================
// CONTAINER COMPONENTS
// =============================================================================

export { Card, default as CardDefault } from './Card';
export type {
  CardProps,
  CardVariant,
  CardHeaderProps,
  CardTitleProps,
  CardContentProps,
  CardFooterProps,
} from './Card';

export { ListItem, default as ListItemDefault } from './ListItem';
export type { ListItemProps } from './ListItem';

// =============================================================================
// PRIMITIVES
// =============================================================================

export { Box, default as BoxDefault } from './Box';
export type {
  BoxProps,
  SpacingSize,
  RadiusSize,
  BgColor,
  BorderColor,
  BorderWidth,
  ElevationLevel,
} from './Box';

export { Text, default as TextDefault } from './Text';
export type {
  TextProps,
  TextVariant,
  TextColor,
  TextWeight,
  TextAlign,
} from './Text';

export {
  Stack,
  HStack,
  VStack,
  Center,
  Spacer,
  Divider,
  default as StackDefault,
} from './Stack';
export type {
  StackProps,
  StackDirection,
  StackGap,
  StackAlign,
  StackJustify,
  CenterProps,
  SpacerProps,
  DividerProps,
} from './Stack';

// =============================================================================
// OVERLAY COMPONENTS
// =============================================================================

export { BottomSheet } from './BottomSheet';

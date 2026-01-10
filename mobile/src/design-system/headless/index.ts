/**
 * Mealio Design System - Headless Components
 *
 * This module exports headless hooks that encapsulate behavior, accessibility,
 * and state management WITHOUT any styling. These hooks follow the headless
 * component pattern, allowing complete flexibility in styling while ensuring
 * consistent behavior and accessibility across the application.
 *
 * Each hook returns:
 * - Props objects to spread on UI elements
 * - State objects for conditional rendering
 * - Control methods for imperative actions
 *
 * @example
 * ```tsx
 * import { useButton, useToggle, useInput } from '@/design-system/headless';
 *
 * // Use hooks in your styled components
 * function MyButton(props) {
 *   const { buttonProps, state } = useButton(props);
 *   return <Pressable {...buttonProps}>...</Pressable>;
 * }
 * ```
 */

// ============================================================================
// Button
// ============================================================================

export {
  useButton,
  default as useButtonDefault,
  type UseButtonProps,
  type UseButtonReturn,
  type ButtonProps,
  type ButtonState,
} from './useButton';

// ============================================================================
// Toggle (Switch)
// ============================================================================

export {
  useToggle,
  default as useToggleDefault,
  type UseToggleProps,
  type UseToggleReturn,
  type ToggleProps,
  type ToggleLabelProps,
  type ToggleState,
} from './useToggle';

// ============================================================================
// Input
// ============================================================================

export {
  useInput,
  default as useInputDefault,
  type UseInputProps,
  type UseInputReturn,
  type InputProps,
  type LabelProps,
  type ErrorProps,
  type InputState,
} from './useInput';

// ============================================================================
// Checkbox
// ============================================================================

export {
  useCheckbox,
  default as useCheckboxDefault,
  type UseCheckboxProps,
  type UseCheckboxReturn,
  type CheckboxProps,
  type CheckboxLabelProps,
  type CheckboxIndicatorProps,
  type CheckboxState,
} from './useCheckbox';

// ============================================================================
// Card
// ============================================================================

export {
  useCard,
  default as useCardDefault,
  type UseCardProps,
  type UseCardReturn,
  type CardProps,
  type CardHeaderProps,
  type CardContentProps,
  type CardFooterProps,
  type CardState,
  type CardVariant,
} from './useCard';

// ============================================================================
// List Item
// ============================================================================

export {
  useListItem,
  default as useListItemDefault,
  type UseListItemProps,
  type UseListItemReturn,
  type ListItemProps,
  type ListItemContentProps,
  type ListItemLeadingProps,
  type ListItemTrailingProps,
  type ListItemState,
  type SelectionMode,
} from './useListItem';

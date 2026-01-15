/**
 * useListItem - Headless hook for list item behavior and accessibility
 *
 * Provides all the necessary props and state management for building
 * accessible list item components without any styling opinions.
 *
 * Features:
 * - Press handling
 * - Selected state
 * - Disabled state
 * - Proper accessibility attributes for list contexts
 * - Support for single and multi-select patterns
 *
 * @example
 * ```tsx
 * function ListItem({ title, subtitle, ...props }) {
 *   const { listItemProps, state } = useListItem(props);
 *
 *   return (
 *     <Pressable
 *       {...listItemProps}
 *       style={[
 *         styles.listItem,
 *         state.isSelected && styles.selected,
 *         state.isPressed && styles.pressed,
 *         state.isDisabled && styles.disabled,
 *       ]}
 *     >
 *       <View>
 *         <Text>{title}</Text>
 *         {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
 *       </View>
 *       {state.isSelected && <CheckIcon />}
 *     </Pressable>
 *   );
 * }
 * ```
 */

import { useCallback, useState, useId } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Selection mode for the list item */
export type SelectionMode = 'none' | 'single' | 'multiple';

export interface UseListItemProps {
  /** Whether the list item is selected */
  selected?: boolean;
  /** Whether the list item is disabled */
  disabled?: boolean;
  /** Callback fired when the list item is pressed */
  onPress?: () => void;
  /** Callback fired when the list item press starts */
  onPressIn?: () => void;
  /** Callback fired when the list item press ends */
  onPressOut?: () => void;
  /** Callback fired on long press */
  onLongPress?: () => void;
  /** Callback fired when selection changes */
  onSelect?: (selected: boolean) => void;
  /** Selection mode (affects ARIA attributes) */
  selectionMode?: SelectionMode;
  /** Index of the item in the list (for accessibility) */
  index?: number;
  /** Total count of items in the list (for accessibility) */
  totalCount?: number;
  /** Accessible label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Unique identifier for the list item */
  id?: string;
}

export interface ListItemState {
  /** Whether the list item is currently selected */
  isSelected: boolean;
  /** Whether the list item is disabled */
  isDisabled: boolean;
  /** Whether the list item is currently being pressed */
  isPressed: boolean;
  /** Whether the list item is focused */
  isFocused: boolean;
  /** Current selection mode */
  selectionMode: SelectionMode;
}

export interface ListItemProps {
  /** Accessibility role for React Native */
  accessibilityRole: 'button' | 'menuitem';
  /** Accessibility state */
  accessibilityState: {
    disabled: boolean;
    selected: boolean | undefined;
    checked: boolean | undefined;
  };
  /** Accessible label */
  accessibilityLabel: string | undefined;
  /** Accessibility hint */
  accessibilityHint: string | undefined;
  /** Position info for screen readers */
  accessibilityValue: { text: string } | undefined;
  /** Whether the list item is disabled */
  disabled: boolean;
  /** Handler for press events */
  onPress: () => void;
  /** Handler for press in events */
  onPressIn: () => void;
  /** Handler for press out events */
  onPressOut: () => void;
  /** Handler for long press events */
  onLongPress: (() => void) | undefined;
  /** Handler for focus events */
  onFocus: () => void;
  /** Handler for blur events */
  onBlur: () => void;
  /** Tab index for keyboard navigation (web) */
  tabIndex: number;
  /** Keyboard event handler (web) */
  onKeyDown: (event: KeyboardEvent) => void;
  /** Unique identifier */
  id: string;
  /** ARIA role (web) */
  role: 'button' | 'menuitem' | 'option';
  /** ARIA disabled state (web) */
  'aria-disabled': boolean;
  /** ARIA selected state (web) */
  'aria-selected': boolean | undefined;
  /** ARIA checked state for multi-select (web) */
  'aria-checked': boolean | undefined;
  /** ARIA position in set (web) */
  'aria-posinset': number | undefined;
  /** ARIA set size (web) */
  'aria-setsize': number | undefined;
}

export interface ListItemContentProps {
  /** Accessibility role */
  accessibilityRole: 'none';
}

export interface ListItemLeadingProps {
  /** Accessibility role */
  accessibilityRole: 'none';
  /** Accessibility hidden (decorative) */
  accessibilityElementsHidden: boolean;
  /** ARIA hidden (web) */
  'aria-hidden': boolean;
}

export interface ListItemTrailingProps {
  /** Accessibility role */
  accessibilityRole: 'none';
  /** Accessibility hidden (decorative) */
  accessibilityElementsHidden: boolean;
  /** ARIA hidden (web) */
  'aria-hidden': boolean;
}

export interface UseListItemReturn {
  /** Props to spread on the list item container */
  listItemProps: ListItemProps;
  /** Props to spread on the content area */
  contentProps: ListItemContentProps;
  /** Props to spread on the leading element (icon, avatar, etc.) */
  leadingProps: ListItemLeadingProps;
  /** Props to spread on the trailing element (chevron, checkbox, etc.) */
  trailingProps: ListItemTrailingProps;
  /** Current state of the list item */
  state: ListItemState;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Get the appropriate ARIA role based on selection mode
 */
function getRole(
  selectionMode: SelectionMode
): 'button' | 'menuitem' | 'option' {
  switch (selectionMode) {
    case 'single':
      return 'option';
    case 'multiple':
      return 'option';
    default:
      return 'button';
  }
}

/**
 * Get the appropriate accessibility role based on selection mode
 * Note: React Native only supports 'button' and 'menuitem', not 'option'
 */
function getAccessibilityRole(
  selectionMode: SelectionMode
): 'button' | 'menuitem' {
  switch (selectionMode) {
    case 'single':
    case 'multiple':
      return 'menuitem';
    default:
      return 'button';
  }
}

/**
 * Hook for managing list item behavior and accessibility
 *
 * @param props - Configuration options for the list item
 * @returns Object containing list item props, sub-component props, and state
 */
export function useListItem(props: UseListItemProps = {}): UseListItemReturn {
  const {
    selected = false,
    disabled = false,
    onPress,
    onPressIn,
    onPressOut,
    onLongPress,
    onSelect,
    selectionMode = 'none',
    index,
    totalCount,
    accessibilityLabel,
    accessibilityHint,
    id: providedId,
  } = props;

  // Generate unique ID
  const generatedId = useId();
  const id = providedId ?? generatedId;

  // UI state
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  /**
   * Handle press events
   */
  const handlePress = useCallback(() => {
    if (disabled) return;

    // If in selection mode, toggle selection
    if (selectionMode !== 'none' && onSelect) {
      onSelect(!selected);
    }

    onPress?.();
  }, [disabled, selectionMode, selected, onSelect, onPress]);

  /**
   * Handle press in events
   */
  const handlePressIn = useCallback(() => {
    if (disabled) return;
    setIsPressed(true);
    onPressIn?.();
  }, [disabled, onPressIn]);

  /**
   * Handle press out events
   */
  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    onPressOut?.();
  }, [onPressOut]);

  /**
   * Handle long press events
   */
  const handleLongPress = useCallback(() => {
    if (disabled) return;
    onLongPress?.();
  }, [disabled, onLongPress]);

  /**
   * Handle focus events
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  /**
   * Handle blur events
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  /**
   * Handle keyboard events for web accessibility
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      // Activate on Enter or Space
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handlePress();
      }
    },
    [disabled, handlePress]
  );

  // List item state object
  const state: ListItemState = {
    isSelected: selected,
    isDisabled: disabled,
    isPressed,
    isFocused,
    selectionMode,
  };

  // Build accessibility state based on selection mode
  const accessibilityState: ListItemProps['accessibilityState'] = {
    disabled,
    selected: selectionMode === 'single' ? selected : undefined,
    checked: selectionMode === 'multiple' ? selected : undefined,
  };

  // Build accessibility value for position info
  const accessibilityValue =
    index !== undefined && totalCount !== undefined
      ? { text: `${index + 1} of ${totalCount}` }
      : undefined;

  // Get roles based on selection mode
  const role = getRole(selectionMode);
  const accessibilityRole = getAccessibilityRole(selectionMode);

  // Props to spread on the list item container
  const listItemProps: ListItemProps = {
    accessibilityRole,
    accessibilityState,
    accessibilityLabel,
    accessibilityHint,
    accessibilityValue,
    disabled,
    onPress: handlePress,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    onLongPress: onLongPress ? handleLongPress : undefined,
    onFocus: handleFocus,
    onBlur: handleBlur,
    tabIndex: disabled ? -1 : 0,
    onKeyDown: handleKeyDown,
    id,
    role,
    'aria-disabled': disabled,
    'aria-selected': selectionMode === 'single' ? selected : undefined,
    'aria-checked': selectionMode === 'multiple' ? selected : undefined,
    'aria-posinset': index !== undefined ? index + 1 : undefined,
    'aria-setsize': totalCount !== undefined ? totalCount : undefined,
  };

  // Props for sub-components
  const contentProps: ListItemContentProps = {
    accessibilityRole: 'none',
  };

  const leadingProps: ListItemLeadingProps = {
    accessibilityRole: 'none',
    accessibilityElementsHidden: true,
    'aria-hidden': true,
  };

  const trailingProps: ListItemTrailingProps = {
    accessibilityRole: 'none',
    accessibilityElementsHidden: true,
    'aria-hidden': true,
  };

  return {
    listItemProps,
    contentProps,
    leadingProps,
    trailingProps,
    state,
  };
}

export default useListItem;

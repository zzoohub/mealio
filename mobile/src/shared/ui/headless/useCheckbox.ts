/**
 * useCheckbox - Headless hook for checkbox behavior and accessibility
 *
 * Provides all the necessary props and state management for building
 * accessible checkbox components without any styling opinions.
 *
 * Features:
 * - Checked state management (controlled/uncontrolled)
 * - Indeterminate state support
 * - Disabled state
 * - Proper ARIA attributes
 * - Label association
 *
 * @example
 * ```tsx
 * function Checkbox({ label, ...props }) {
 *   const { checkboxProps, labelProps, indicatorProps, state } = useCheckbox(props);
 *
 *   return (
 *     <Pressable {...checkboxProps} style={styles.container}>
 *       <View style={[
 *         styles.checkbox,
 *         state.isChecked && styles.checked,
 *         state.isIndeterminate && styles.indeterminate,
 *         state.isDisabled && styles.disabled,
 *       ]}>
 *         {state.isChecked && <CheckIcon />}
 *         {state.isIndeterminate && <MinusIcon />}
 *       </View>
 *       <Text {...labelProps}>{label}</Text>
 *     </Pressable>
 *   );
 * }
 * ```
 */

import { useCallback, useState, useId } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseCheckboxProps {
  /** Controlled checked state */
  checked?: boolean;
  /** Default checked state for uncontrolled usage */
  defaultChecked?: boolean;
  /** Whether the checkbox is in indeterminate state */
  indeterminate?: boolean;
  /** Callback fired when the checked state changes */
  onChange?: (checked: boolean) => void;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Whether the checkbox is required */
  required?: boolean;
  /** Accessible label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Unique identifier for the checkbox */
  id?: string;
  /** Name attribute for form submission */
  name?: string;
  /** Value attribute for form submission */
  value?: string;
}

export interface CheckboxState {
  /** Whether the checkbox is currently checked */
  isChecked: boolean;
  /** Whether the checkbox is in indeterminate state */
  isIndeterminate: boolean;
  /** Whether the checkbox is disabled */
  isDisabled: boolean;
  /** Whether the checkbox is currently being pressed */
  isPressed: boolean;
  /** Whether the checkbox is focused */
  isFocused: boolean;
}

export interface CheckboxProps {
  /** ARIA role for checkbox */
  role: 'checkbox';
  /** Accessibility role for React Native */
  accessibilityRole: 'checkbox';
  /** Accessibility state */
  accessibilityState: {
    checked: boolean | 'mixed';
    disabled: boolean;
  };
  /** Accessible label */
  accessibilityLabel: string | undefined;
  /** Accessibility hint */
  accessibilityHint: string | undefined;
  /** Whether the checkbox is disabled */
  disabled: boolean;
  /** Handler for press events */
  onPress: () => void;
  /** Handler for press in events */
  onPressIn: () => void;
  /** Handler for press out events */
  onPressOut: () => void;
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
  /** ARIA checked state (web) */
  'aria-checked': boolean | 'mixed';
  /** ARIA disabled state (web) */
  'aria-disabled': boolean;
  /** ARIA required state (web) */
  'aria-required': boolean | undefined;
  /** ARIA labelled by (web) */
  'aria-labelledby': string;
}

export interface CheckboxLabelProps {
  /** Native ID for label association */
  nativeID: string;
  /** Handler for press events */
  onPress: () => void;
  /** Accessibility role */
  accessibilityRole: 'text';
}

export interface CheckboxIndicatorProps {
  /** Whether the indicator should be visible */
  visible: boolean;
  /** Accessibility hidden */
  accessibilityElementsHidden: boolean;
  /** Import for accessibility hidden (web) */
  'aria-hidden': boolean;
}

export interface UseCheckboxReturn {
  /** Props to spread on the checkbox container */
  checkboxProps: CheckboxProps;
  /** Props to spread on the label element */
  labelProps: CheckboxLabelProps;
  /** Props to spread on the indicator element */
  indicatorProps: CheckboxIndicatorProps;
  /** Current state of the checkbox */
  state: CheckboxState;
  /** Toggle the checked state */
  toggle: () => void;
  /** Set the checked state explicitly */
  setChecked: (checked: boolean) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing checkbox behavior and accessibility
 *
 * @param props - Configuration options for the checkbox
 * @returns Object containing checkbox props, label props, indicator props, state, and control methods
 */
export function useCheckbox(props: UseCheckboxProps = {}): UseCheckboxReturn {
  const {
    checked: controlledChecked,
    defaultChecked = false,
    indeterminate = false,
    onChange,
    disabled = false,
    required = false,
    accessibilityLabel,
    accessibilityHint,
    id: providedId,
    name,
    value,
  } = props;

  // Generate unique IDs
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const labelId = `${id}-label`;

  // Determine if component is controlled
  const isControlled = controlledChecked !== undefined;

  // Internal state
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Use controlled value if provided, otherwise use internal state
  const isChecked = isControlled ? controlledChecked : internalChecked;

  /**
   * Toggle the checked state
   */
  const toggle = useCallback(() => {
    if (disabled) return;

    const newChecked = !isChecked;

    // Update internal state if uncontrolled
    if (!isControlled) {
      setInternalChecked(newChecked);
    }

    // Call onChange callback
    onChange?.(newChecked);
  }, [disabled, isChecked, isControlled, onChange]);

  /**
   * Set checked state explicitly
   */
  const setChecked = useCallback(
    (newChecked: boolean) => {
      if (disabled) return;

      // Update internal state if uncontrolled
      if (!isControlled) {
        setInternalChecked(newChecked);
      }

      // Call onChange callback if value changed
      if (newChecked !== isChecked) {
        onChange?.(newChecked);
      }
    },
    [disabled, isChecked, isControlled, onChange]
  );

  /**
   * Handle press events
   */
  const handlePress = useCallback(() => {
    toggle();
  }, [toggle]);

  /**
   * Handle press in events
   */
  const handlePressIn = useCallback(() => {
    if (!disabled) {
      setIsPressed(true);
    }
  }, [disabled]);

  /**
   * Handle press out events
   */
  const handlePressOut = useCallback(() => {
    setIsPressed(false);
  }, []);

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
   * Supports Space key activation
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      // Checkboxes are activated with Space, not Enter
      if (event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    },
    [disabled, toggle]
  );

  /**
   * Handle label press to toggle
   */
  const handleLabelPress = useCallback(() => {
    if (!disabled) {
      toggle();
    }
  }, [disabled, toggle]);

  // Compute ARIA checked value (supports 'mixed' for indeterminate)
  const ariaChecked: boolean | 'mixed' = indeterminate ? 'mixed' : isChecked;

  // Checkbox state object
  const state: CheckboxState = {
    isChecked,
    isIndeterminate: indeterminate,
    isDisabled: disabled,
    isPressed,
    isFocused,
  };

  // Props to spread on the checkbox container
  const checkboxProps: CheckboxProps = {
    role: 'checkbox',
    accessibilityRole: 'checkbox',
    accessibilityState: {
      checked: indeterminate ? 'mixed' : isChecked,
      disabled,
    },
    accessibilityLabel,
    accessibilityHint,
    disabled,
    onPress: handlePress,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    onFocus: handleFocus,
    onBlur: handleBlur,
    tabIndex: disabled ? -1 : 0,
    onKeyDown: handleKeyDown,
    id,
    'aria-checked': ariaChecked,
    'aria-disabled': disabled,
    'aria-required': required ? true : undefined,
    'aria-labelledby': labelId,
  };

  // Props to spread on the label element
  const labelProps: CheckboxLabelProps = {
    nativeID: labelId,
    onPress: handleLabelPress,
    accessibilityRole: 'text',
  };

  // Props to spread on the indicator (check/minus icon)
  const indicatorProps: CheckboxIndicatorProps = {
    visible: isChecked || indeterminate,
    accessibilityElementsHidden: true,
    'aria-hidden': true,
  };

  return {
    checkboxProps,
    labelProps,
    indicatorProps,
    state,
    toggle,
    setChecked,
  };
}

export default useCheckbox;

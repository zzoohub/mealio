/**
 * useToggle - Headless hook for toggle/switch behavior and accessibility
 *
 * Provides all the necessary props and state management for building
 * accessible toggle/switch components without any styling opinions.
 *
 * @example
 * ```tsx
 * function Toggle({ label, ...props }) {
 *   const { toggleProps, labelProps, state } = useToggle(props);
 *
 *   return (
 *     <View style={styles.container}>
 *       <Text {...labelProps}>{label}</Text>
 *       <Pressable
 *         {...toggleProps}
 *         style={[
 *           styles.track,
 *           state.isChecked && styles.trackChecked,
 *           state.isDisabled && styles.disabled,
 *         ]}
 *       >
 *         <View style={[styles.thumb, state.isChecked && styles.thumbChecked]} />
 *       </Pressable>
 *     </View>
 *   );
 * }
 * ```
 */

import { useCallback, useState, useId } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseToggleProps {
  /** Controlled checked state */
  checked?: boolean;
  /** Default checked state for uncontrolled usage */
  defaultChecked?: boolean;
  /** Callback fired when the toggle state changes */
  onChange?: (checked: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Whether the toggle is required */
  required?: boolean;
  /** Accessible label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Unique identifier for the toggle */
  id?: string;
  /** Name attribute for form submission */
  name?: string;
  /** Value attribute for form submission */
  value?: string;
}

export interface ToggleState {
  /** Whether the toggle is currently checked */
  isChecked: boolean;
  /** Whether the toggle is disabled */
  isDisabled: boolean;
  /** Whether the toggle is currently being pressed */
  isPressed: boolean;
  /** Whether the toggle is focused */
  isFocused: boolean;
}

export interface ToggleProps {
  /** ARIA role for switch */
  role: 'switch';
  /** Accessibility role for React Native */
  accessibilityRole: 'switch';
  /** Accessibility state */
  accessibilityState: {
    checked: boolean;
    disabled: boolean;
  };
  /** Accessible label */
  accessibilityLabel: string | undefined;
  /** Accessibility hint */
  accessibilityHint: string | undefined;
  /** Whether the toggle is disabled */
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
  'aria-checked': boolean;
  /** ARIA disabled state (web) */
  'aria-disabled': boolean;
  /** ARIA required state (web) */
  'aria-required': boolean | undefined;
}

export interface ToggleLabelProps {
  /** Native ID for label association */
  nativeID: string;
  /** Handler for press events */
  onPress: () => void;
  /** Accessibility role */
  accessibilityRole: 'text';
}

export interface UseToggleReturn {
  /** Props to spread on the toggle element */
  toggleProps: ToggleProps;
  /** Props to spread on the label element */
  labelProps: ToggleLabelProps;
  /** Current state of the toggle */
  state: ToggleState;
  /** Toggle the checked state */
  toggle: () => void;
  /** Set the checked state explicitly */
  setChecked: (checked: boolean) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing toggle/switch behavior and accessibility
 *
 * @param props - Configuration options for the toggle
 * @returns Object containing toggle props, label props, state, and control methods
 */
export function useToggle(props: UseToggleProps = {}): UseToggleReturn {
  const {
    checked: controlledChecked,
    defaultChecked = false,
    onChange,
    disabled = false,
    required = false,
    accessibilityLabel,
    accessibilityHint,
    id: providedId,
    name,
    value,
  } = props;

  // Generate a unique ID if not provided
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const labelId = `${id}-label`;

  // Determine if component is controlled or uncontrolled
  const isControlled = controlledChecked !== undefined;

  // Internal state for uncontrolled usage
  const [internalChecked, setInternalChecked] = useState(defaultChecked);

  // Use controlled value if provided, otherwise use internal state
  const isChecked = isControlled ? controlledChecked : internalChecked;

  // UI state
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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
   * Supports Enter and Space key activation
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      if (event.key === 'Enter' || event.key === ' ') {
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

  // Toggle state object
  const state: ToggleState = {
    isChecked,
    isDisabled: disabled,
    isPressed,
    isFocused,
  };

  // Props to spread on the toggle element
  const toggleProps: ToggleProps = {
    role: 'switch',
    accessibilityRole: 'switch',
    accessibilityState: {
      checked: isChecked,
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
    'aria-checked': isChecked,
    'aria-disabled': disabled,
    'aria-required': required ? true : undefined,
  };

  // Props to spread on the label element
  const labelProps: ToggleLabelProps = {
    nativeID: labelId,
    onPress: handleLabelPress,
    accessibilityRole: 'text',
  };

  return {
    toggleProps,
    labelProps,
    state,
    toggle,
    setChecked,
  };
}

export default useToggle;

/**
 * useButton - Headless hook for button behavior and accessibility
 *
 * Provides all the necessary props and state management for building
 * accessible button components without any styling opinions.
 *
 * @example
 * ```tsx
 * function Button({ children, ...props }) {
 *   const { buttonProps, state } = useButton(props);
 *
 *   return (
 *     <Pressable
 *       {...buttonProps}
 *       style={{ opacity: state.isDisabled ? 0.5 : 1 }}
 *     >
 *       {state.isLoading ? <Spinner /> : children}
 *     </Pressable>
 *   );
 * }
 * ```
 */

import { useCallback, useState, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseButtonProps {
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Callback fired when the button is pressed */
  onPress?: () => void;
  /** Callback fired when the button press starts */
  onPressIn?: () => void;
  /** Callback fired when the button press ends */
  onPressOut?: () => void;
  /** Callback fired on long press */
  onLongPress?: () => void;
  /** Accessible label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Type of button for form submission context */
  type?: 'button' | 'submit' | 'reset';
}

export interface ButtonState {
  /** Whether the button is currently disabled (disabled or loading) */
  isDisabled: boolean;
  /** Whether the button is in loading state */
  isLoading: boolean;
  /** Whether the button is currently being pressed */
  isPressed: boolean;
}

export interface ButtonProps {
  /** ARIA role for the button */
  role: 'button';
  /** Accessibility role for React Native */
  accessibilityRole: 'button';
  /** Whether the element is disabled for accessibility */
  accessibilityState: {
    disabled: boolean;
    busy: boolean;
  };
  /** Accessible label */
  accessibilityLabel: string | undefined;
  /** Accessibility hint */
  accessibilityHint: string | undefined;
  /** Whether the button is disabled */
  disabled: boolean;
  /** Handler for press events */
  onPress: () => void;
  /** Handler for press in events */
  onPressIn: () => void;
  /** Handler for press out events */
  onPressOut: () => void;
  /** Handler for long press events */
  onLongPress: (() => void) | undefined;
  /** Tab index for keyboard navigation (web) */
  tabIndex: number;
  /** Keyboard event handler (web) */
  onKeyDown: (event: KeyboardEvent) => void;
}

export interface UseButtonReturn {
  /** Props to spread on the button element */
  buttonProps: ButtonProps;
  /** Current state of the button */
  state: ButtonState;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing button behavior and accessibility
 *
 * @param props - Configuration options for the button
 * @returns Object containing button props and state
 */
export function useButton(props: UseButtonProps = {}): UseButtonReturn {
  const {
    disabled = false,
    loading = false,
    onPress,
    onPressIn,
    onPressOut,
    onLongPress,
    accessibilityLabel,
    accessibilityHint,
  } = props;

  // Track pressed state for visual feedback
  const [isPressed, setIsPressed] = useState(false);

  // Ref to track if the component is still mounted
  const isMountedRef = useRef(true);

  // Computed disabled state (disabled when loading or explicitly disabled)
  const isDisabled = disabled || loading;

  /**
   * Handle press events
   * Only fires if button is not disabled
   */
  const handlePress = useCallback(() => {
    if (isDisabled) return;
    onPress?.();
  }, [isDisabled, onPress]);

  /**
   * Handle press in events
   * Updates pressed state and calls callback
   */
  const handlePressIn = useCallback(() => {
    if (isDisabled) return;
    setIsPressed(true);
    onPressIn?.();
  }, [isDisabled, onPressIn]);

  /**
   * Handle press out events
   * Updates pressed state and calls callback
   */
  const handlePressOut = useCallback(() => {
    if (isMountedRef.current) {
      setIsPressed(false);
    }
    onPressOut?.();
  }, [onPressOut]);

  /**
   * Handle long press events
   */
  const handleLongPress = useCallback(() => {
    if (isDisabled) return;
    onLongPress?.();
  }, [isDisabled, onLongPress]);

  /**
   * Handle keyboard events for web accessibility
   * Supports Enter and Space key activation
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isDisabled) return;

      // Activate button on Enter or Space
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onPress?.();
      }
    },
    [isDisabled, onPress]
  );

  // Button state object
  const state: ButtonState = {
    isDisabled,
    isLoading: loading,
    isPressed,
  };

  // Props to spread on the button element
  const buttonProps: ButtonProps = {
    role: 'button',
    accessibilityRole: 'button',
    accessibilityState: {
      disabled: isDisabled,
      busy: loading,
    },
    accessibilityLabel,
    accessibilityHint,
    disabled: isDisabled,
    onPress: handlePress,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    onLongPress: onLongPress ? handleLongPress : undefined,
    tabIndex: isDisabled ? -1 : 0,
    onKeyDown: handleKeyDown,
  };

  return {
    buttonProps,
    state,
  };
}

export default useButton;

/**
 * useCard - Headless hook for card behavior and accessibility
 *
 * Provides all the necessary props and state management for building
 * accessible card components without any styling opinions.
 *
 * Features:
 * - Pressable variant support
 * - Visual variants (elevated, outline, filled, ghost)
 * - Proper accessibility attributes
 * - Press state management
 *
 * @example
 * ```tsx
 * function Card({ children, ...props }) {
 *   const { cardProps, state } = useCard(props);
 *
 *   return (
 *     <Pressable
 *       {...cardProps}
 *       style={[
 *         styles.card,
 *         styles[props.variant || 'elevated'],
 *         state.isPressed && styles.pressed,
 *       ]}
 *     >
 *       {children}
 *     </Pressable>
 *   );
 * }
 * ```
 */

import { useCallback, useState, useId } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Visual variant of the card */
export type CardVariant = 'elevated' | 'outline' | 'filled' | 'ghost';

export interface UseCardProps {
  /** Visual variant of the card */
  variant?: CardVariant;
  /** Whether the card is pressable/interactive */
  pressable?: boolean;
  /** Whether the card is currently selected */
  selected?: boolean;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Callback fired when the card is pressed */
  onPress?: () => void;
  /** Callback fired when the card press starts */
  onPressIn?: () => void;
  /** Callback fired when the card press ends */
  onPressOut?: () => void;
  /** Callback fired on long press */
  onLongPress?: () => void;
  /** Accessible label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Unique identifier for the card */
  id?: string;
}

export interface CardState {
  /** Current visual variant */
  variant: CardVariant;
  /** Whether the card is pressable */
  isPressable: boolean;
  /** Whether the card is currently being pressed */
  isPressed: boolean;
  /** Whether the card is selected */
  isSelected: boolean;
  /** Whether the card is disabled */
  isDisabled: boolean;
}

export interface CardProps {
  /** Accessibility role (button if pressable, none otherwise) */
  accessibilityRole: 'button' | 'none';
  /** Accessibility state */
  accessibilityState: {
    disabled: boolean | undefined;
    selected: boolean | undefined;
  };
  /** Accessible label */
  accessibilityLabel: string | undefined;
  /** Accessibility hint */
  accessibilityHint: string | undefined;
  /** Whether the card is disabled (for pressable) */
  disabled: boolean | undefined;
  /** Handler for press events (if pressable) */
  onPress: (() => void) | undefined;
  /** Handler for press in events (if pressable) */
  onPressIn: (() => void) | undefined;
  /** Handler for press out events (if pressable) */
  onPressOut: (() => void) | undefined;
  /** Handler for long press events (if pressable) */
  onLongPress: (() => void) | undefined;
  /** Tab index for keyboard navigation (web) */
  tabIndex: number | undefined;
  /** Keyboard event handler (web) */
  onKeyDown: ((event: KeyboardEvent) => void) | undefined;
  /** Unique identifier */
  id: string;
  /** ARIA role (web) */
  role: 'button' | 'article';
  /** ARIA disabled state (web) */
  'aria-disabled': boolean | undefined;
  /** ARIA selected state (web) */
  'aria-selected': boolean | undefined;
}

export interface CardHeaderProps {
  /** Accessibility role */
  accessibilityRole: 'header';
}

export interface CardContentProps {
  /** Accessibility role */
  accessibilityRole: 'none';
}

export interface CardFooterProps {
  /** Accessibility role */
  accessibilityRole: 'none';
}

export interface UseCardReturn {
  /** Props to spread on the card container */
  cardProps: CardProps;
  /** Props to spread on the card header */
  headerProps: CardHeaderProps;
  /** Props to spread on the card content */
  contentProps: CardContentProps;
  /** Props to spread on the card footer */
  footerProps: CardFooterProps;
  /** Current state of the card */
  state: CardState;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing card behavior and accessibility
 *
 * @param props - Configuration options for the card
 * @returns Object containing card props, sub-component props, and state
 */
export function useCard(props: UseCardProps = {}): UseCardReturn {
  const {
    variant = 'elevated',
    pressable = false,
    selected = false,
    disabled = false,
    onPress,
    onPressIn,
    onPressOut,
    onLongPress,
    accessibilityLabel,
    accessibilityHint,
    id: providedId,
  } = props;

  // Generate unique ID
  const generatedId = useId();
  const id = providedId ?? generatedId;

  // Track pressed state for visual feedback
  const [isPressed, setIsPressed] = useState(false);

  // Determine if the card is actually pressable
  const isPressable = pressable || Boolean(onPress);
  const isDisabled = disabled && isPressable;

  /**
   * Handle press events
   */
  const handlePress = useCallback(() => {
    if (isDisabled || !isPressable) return;
    onPress?.();
  }, [isDisabled, isPressable, onPress]);

  /**
   * Handle press in events
   */
  const handlePressIn = useCallback(() => {
    if (isDisabled || !isPressable) return;
    setIsPressed(true);
    onPressIn?.();
  }, [isDisabled, isPressable, onPressIn]);

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
    if (isDisabled || !isPressable) return;
    onLongPress?.();
  }, [isDisabled, isPressable, onLongPress]);

  /**
   * Handle keyboard events for web accessibility
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isDisabled || !isPressable) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onPress?.();
      }
    },
    [isDisabled, isPressable, onPress]
  );

  // Card state object
  const state: CardState = {
    variant,
    isPressable,
    isPressed,
    isSelected: selected,
    isDisabled,
  };

  // Build card props based on whether it's pressable
  const cardProps: CardProps = {
    accessibilityRole: isPressable ? 'button' : 'none',
    accessibilityState: {
      disabled: isPressable ? isDisabled : undefined,
      selected: selected !== undefined ? selected : undefined,
    },
    accessibilityLabel,
    accessibilityHint,
    id,
    role: isPressable ? 'button' : 'article',
    disabled: isPressable ? isDisabled : undefined,
    onPress: isPressable ? handlePress : undefined,
    onPressIn: isPressable ? handlePressIn : undefined,
    onPressOut: isPressable ? handlePressOut : undefined,
    onLongPress: isPressable && onLongPress ? handleLongPress : undefined,
    tabIndex: isPressable ? (isDisabled ? -1 : 0) : undefined,
    onKeyDown: isPressable ? handleKeyDown : undefined,
    'aria-disabled': isPressable ? isDisabled : undefined,
    'aria-selected': selected !== undefined ? selected : undefined,
  };

  // Props for card sub-components
  const headerProps: CardHeaderProps = {
    accessibilityRole: 'header',
  };

  const contentProps: CardContentProps = {
    accessibilityRole: 'none',
  };

  const footerProps: CardFooterProps = {
    accessibilityRole: 'none',
  };

  return {
    cardProps,
    headerProps,
    contentProps,
    footerProps,
    state,
  };
}

export default useCard;

/**
 * useDialog - Headless hook for dialog/modal behavior and accessibility
 *
 * Provides all the necessary props and state management for building
 * accessible dialog/modal components without any styling opinions.
 *
 * Features:
 * - Open/close state management
 * - Focus trap concept (described via props, implementation depends on platform)
 * - Escape key handling (conceptual for RN, practical for web)
 * - Proper ARIA attributes for accessibility
 * - Outside click handling (optional)
 *
 * @example
 * ```tsx
 * function Dialog({ trigger, title, children }) {
 *   const { dialogProps, triggerProps, titleProps, closeProps, state } = useDialog({
 *     onClose: () => console.log('Dialog closed'),
 *   });
 *
 *   return (
 *     <>
 *       <Pressable {...triggerProps}>{trigger}</Pressable>
 *       <Modal visible={state.isOpen} {...dialogProps}>
 *         <View>
 *           <Text {...titleProps}>{title}</Text>
 *           {children}
 *           <Pressable {...closeProps}>
 *             <Text>Close</Text>
 *           </Pressable>
 *         </View>
 *       </Modal>
 *     </>
 *   );
 * }
 * ```
 */

import { useCallback, useState, useId, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseDialogProps {
  /** Controlled open state */
  isOpen?: boolean;
  /** Default open state for uncontrolled usage */
  defaultOpen?: boolean;
  /** Callback fired when the dialog opens */
  onOpen?: () => void;
  /** Callback fired when the dialog closes */
  onClose?: () => void;
  /** Callback fired when open state changes */
  onOpenChange?: (isOpen: boolean) => void;
  /** Whether to close on escape key press */
  closeOnEscape?: boolean;
  /** Whether to close when clicking outside the dialog */
  closeOnOutsideClick?: boolean;
  /** Whether the dialog is modal (traps focus) */
  modal?: boolean;
  /** Accessible label for the dialog */
  accessibilityLabel?: string;
  /** Accessibility hint for the dialog */
  accessibilityHint?: string;
  /** Unique identifier for the dialog */
  id?: string;
  /** Role for the dialog (dialog or alertdialog) */
  role?: 'dialog' | 'alertdialog';
}

export interface DialogState {
  /** Whether the dialog is currently open */
  isOpen: boolean;
  /** Whether the dialog has been opened at least once */
  hasBeenOpened: boolean;
}

export interface DialogProps {
  /** ARIA role for the dialog */
  role: 'dialog' | 'alertdialog';
  /** Accessibility role for React Native */
  accessibilityRole: 'none';
  /** Accessibility view is modal */
  accessibilityViewIsModal: boolean;
  /** Accessible label */
  accessibilityLabel: string | undefined;
  /** Accessibility hint */
  accessibilityHint: string | undefined;
  /** ARIA modal attribute (web) */
  'aria-modal': boolean;
  /** ARIA labelled by (web) */
  'aria-labelledby': string;
  /** ARIA described by (web) */
  'aria-describedby'?: string;
  /** Unique identifier */
  id: string;
  /** Keyboard event handler (web) */
  onKeyDown: (event: KeyboardEvent) => void;
  /** Handler for backdrop/outside press */
  onBackdropPress: () => void;
  /** Handler for hardware back button (Android) */
  onRequestClose: () => void;
}

export interface TriggerProps {
  /** Handler for press events */
  onPress: () => void;
  /** Accessibility role */
  accessibilityRole: 'button';
  /** Accessibility state */
  accessibilityState: {
    expanded: boolean;
  };
  /** ARIA expanded state (web) */
  'aria-expanded': boolean;
  /** ARIA controls (web) */
  'aria-controls': string;
  /** ARIA has popup (web) */
  'aria-haspopup': 'dialog';
}

export interface TitleProps {
  /** Native ID for title association */
  nativeID: string;
  /** Accessibility role */
  accessibilityRole: 'header';
}

export interface DescriptionProps {
  /** Native ID for description association */
  nativeID: string;
  /** Accessibility role */
  accessibilityRole: 'text';
}

export interface CloseProps {
  /** Handler for press events */
  onPress: () => void;
  /** Accessibility role */
  accessibilityRole: 'button';
  /** Accessible label */
  accessibilityLabel: string;
}

export interface UseDialogReturn {
  /** Props to spread on the dialog element */
  dialogProps: DialogProps;
  /** Props to spread on the trigger element */
  triggerProps: TriggerProps;
  /** Props to spread on the title element */
  titleProps: TitleProps;
  /** Props to spread on the description element */
  descriptionProps: DescriptionProps;
  /** Props to spread on the close button */
  closeProps: CloseProps;
  /** Current state of the dialog */
  state: DialogState;
  /** Open the dialog */
  open: () => void;
  /** Close the dialog */
  close: () => void;
  /** Toggle the dialog open state */
  toggle: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing dialog/modal behavior and accessibility
 *
 * @param props - Configuration options for the dialog
 * @returns Object containing dialog props, trigger props, state, and control methods
 */
export function useDialog(props: UseDialogProps = {}): UseDialogReturn {
  const {
    isOpen: controlledIsOpen,
    defaultOpen = false,
    onOpen,
    onClose,
    onOpenChange,
    closeOnEscape = true,
    closeOnOutsideClick = true,
    modal = true,
    accessibilityLabel,
    accessibilityHint,
    id: providedId,
    role = 'dialog',
  } = props;

  // Generate unique IDs
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  // Determine if component is controlled
  const isControlled = controlledIsOpen !== undefined;

  // Internal state
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultOpen);

  // Track previous focus element for restoration
  const previousFocusRef = useRef<Element | null>(null);

  // Use controlled value if provided, otherwise use internal state
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  /**
   * Open the dialog
   */
  const open = useCallback(() => {
    // Store currently focused element
    if (typeof document !== 'undefined') {
      previousFocusRef.current = document.activeElement;
    }

    if (!isControlled) {
      setInternalIsOpen(true);
    }

    setHasBeenOpened(true);
    onOpen?.();
    onOpenChange?.(true);
  }, [isControlled, onOpen, onOpenChange]);

  /**
   * Close the dialog
   */
  const close = useCallback(() => {
    if (!isControlled) {
      setInternalIsOpen(false);
    }

    onClose?.();
    onOpenChange?.(false);

    // Restore focus to previously focused element (web)
    if (typeof document !== 'undefined' && previousFocusRef.current) {
      (previousFocusRef.current as HTMLElement).focus?.();
    }
  }, [isControlled, onClose, onOpenChange]);

  /**
   * Toggle the dialog open state
   */
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  /**
   * Handle keyboard events
   * Closes dialog on Escape key if enabled
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (closeOnEscape && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    },
    [isOpen, closeOnEscape, close]
  );

  /**
   * Handle backdrop/outside press
   */
  const handleBackdropPress = useCallback(() => {
    if (closeOnOutsideClick) {
      close();
    }
  }, [closeOnOutsideClick, close]);

  /**
   * Handle hardware back button (Android)
   */
  const handleRequestClose = useCallback(() => {
    close();
  }, [close]);

  /**
   * Handle trigger press
   */
  const handleTriggerPress = useCallback(() => {
    open();
  }, [open]);

  /**
   * Handle close button press
   */
  const handleClosePress = useCallback(() => {
    close();
  }, [close]);

  // Setup keyboard listener for web (escape key)
  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen || !closeOnEscape) {
      return;
    }

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, closeOnEscape, close]);

  // Dialog state object
  const state: DialogState = {
    isOpen,
    hasBeenOpened,
  };

  // Props to spread on the dialog element
  const dialogProps: DialogProps = {
    role,
    accessibilityRole: 'none',
    accessibilityViewIsModal: modal,
    accessibilityLabel,
    accessibilityHint,
    'aria-modal': modal,
    'aria-labelledby': titleId,
    'aria-describedby': descriptionId,
    id,
    onKeyDown: handleKeyDown,
    onBackdropPress: handleBackdropPress,
    onRequestClose: handleRequestClose,
  };

  // Props to spread on the trigger element
  const triggerProps: TriggerProps = {
    onPress: handleTriggerPress,
    accessibilityRole: 'button',
    accessibilityState: {
      expanded: isOpen,
    },
    'aria-expanded': isOpen,
    'aria-controls': id,
    'aria-haspopup': 'dialog',
  };

  // Props to spread on the title element
  const titleProps: TitleProps = {
    nativeID: titleId,
    accessibilityRole: 'header',
  };

  // Props to spread on the description element
  const descriptionProps: DescriptionProps = {
    nativeID: descriptionId,
    accessibilityRole: 'text',
  };

  // Props to spread on the close button
  const closeProps: CloseProps = {
    onPress: handleClosePress,
    accessibilityRole: 'button',
    accessibilityLabel: 'Close dialog',
  };

  return {
    dialogProps,
    triggerProps,
    titleProps,
    descriptionProps,
    closeProps,
    state,
    open,
    close,
    toggle,
  };
}

export default useDialog;

/**
 * useInput - Headless hook for text input behavior and accessibility
 *
 * Provides all the necessary props and state management for building
 * accessible text input components without any styling opinions.
 *
 * @example
 * ```tsx
 * function TextField({ label, error, ...props }) {
 *   const { inputProps, labelProps, errorProps, state } = useInput({
 *     ...props,
 *     error,
 *   });
 *
 *   return (
 *     <View>
 *       <Text {...labelProps}>{label}</Text>
 *       <TextInput
 *         {...inputProps}
 *         style={[
 *           styles.input,
 *           state.isFocused && styles.focused,
 *           state.hasError && styles.error,
 *         ]}
 *       />
 *       {state.hasError && (
 *         <Text {...errorProps}>{error}</Text>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */

import { useCallback, useState, useId, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseInputProps<T = string> {
  /** Controlled value */
  value?: T;
  /** Default value for uncontrolled usage */
  defaultValue?: T;
  /** Callback fired when the value changes */
  onChange?: (value: T) => void;
  /** Callback fired when input receives focus */
  onFocus?: () => void;
  /** Callback fired when input loses focus */
  onBlur?: () => void;
  /** Callback fired when text is submitted (e.g., Enter key) */
  onSubmit?: () => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is read-only */
  readOnly?: boolean;
  /** Whether the input is required */
  required?: boolean;
  /** Error message or boolean indicating error state */
  error?: string | boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Input type for appropriate keyboard */
  type?: 'text' | 'email' | 'password' | 'number' | 'phone' | 'url' | 'search';
  /** Maximum length of input */
  maxLength?: number;
  /** Minimum length of input */
  minLength?: number;
  /** Accessible label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Unique identifier for the input */
  id?: string;
  /** Name attribute for form submission */
  name?: string;
  /** Autocomplete setting */
  autoComplete?:
    | 'off'
    | 'username'
    | 'password'
    | 'email'
    | 'name'
    | 'tel'
    | 'street-address'
    | 'postal-code'
    | 'cc-number';
  /** Whether to auto-capitalize input */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Whether to auto-correct input */
  autoCorrect?: boolean;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
}

export interface InputState {
  /** Current value of the input */
  value: string;
  /** Whether the input is currently focused */
  isFocused: boolean;
  /** Whether the input has an error */
  hasError: boolean;
  /** Whether the input is disabled */
  isDisabled: boolean;
  /** Whether the input is read-only */
  isReadOnly: boolean;
  /** Whether the input has been touched (focused at least once) */
  isTouched: boolean;
  /** Whether the input value has changed from initial */
  isDirty: boolean;
  /** Current character count */
  characterCount: number;
}

export interface InputProps {
  /** Accessibility role for React Native */
  accessibilityRole: 'none';
  /** Accessibility state */
  accessibilityState: {
    disabled: boolean;
  };
  /** Accessible label */
  accessibilityLabel: string | undefined;
  /** Accessibility hint */
  accessibilityHint: string | undefined;
  /** Whether the input is editable */
  editable: boolean;
  /** Current value */
  value: string;
  /** Handler for value changes */
  onChangeText: (text: string) => void;
  /** Handler for focus events */
  onFocus: () => void;
  /** Handler for blur events */
  onBlur: () => void;
  /** Handler for submit events */
  onSubmitEditing: () => void;
  /** Placeholder text */
  placeholder: string | undefined;
  /** Maximum length */
  maxLength: number | undefined;
  /** Whether input is secure (password) */
  secureTextEntry: boolean;
  /** Keyboard type based on input type */
  keyboardType:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad'
    | 'url'
    | 'web-search';
  /** Auto-capitalize setting */
  autoCapitalize: 'none' | 'sentences' | 'words' | 'characters';
  /** Auto-correct setting */
  autoCorrect: boolean;
  /** Auto-focus setting */
  autoFocus: boolean;
  /** Text content type for iOS autofill */
  textContentType:
    | 'none'
    | 'URL'
    | 'creditCardNumber'
    | 'emailAddress'
    | 'name'
    | 'password'
    | 'postalCode'
    | 'streetAddressLine1'
    | 'telephoneNumber'
    | 'username'
    | undefined;
  /** Auto-complete type for Android */
  autoComplete:
    | 'off'
    | 'username'
    | 'password'
    | 'email'
    | 'name'
    | 'tel'
    | 'street-address'
    | 'postal-code'
    | 'cc-number'
    | undefined;
  /** Return key type */
  returnKeyType: 'done' | 'go' | 'next' | 'search' | 'send' | 'default';
  /** Unique identifier */
  id: string;
  /** Native ID for label association */
  nativeID: string;
  /** ARIA invalid state (web) */
  'aria-invalid': boolean;
  /** ARIA disabled state (web) */
  'aria-disabled': boolean;
  /** ARIA required state (web) */
  'aria-required': boolean | undefined;
  /** ARIA described by for error association (web) */
  'aria-describedby': string | undefined;
  /** ARIA labelled by for label association (web) */
  'aria-labelledby': string;
}

export interface LabelProps {
  /** Native ID for label association */
  nativeID: string;
  /** Handler for press events (to focus input) */
  onPress: () => void;
  /** Accessibility role */
  accessibilityRole: 'text';
}

export interface ErrorProps {
  /** Native ID for error association */
  nativeID: string;
  /** ARIA role for error messages */
  role: 'alert';
  /** Accessibility role */
  accessibilityRole: 'alert';
  /** Accessibility live region */
  accessibilityLiveRegion: 'polite';
}

export interface UseInputReturn {
  /** Props to spread on the input element */
  inputProps: InputProps;
  /** Props to spread on the label element */
  labelProps: LabelProps;
  /** Props to spread on the error element */
  errorProps: ErrorProps;
  /** Current state of the input */
  state: InputState;
  /** Focus the input programmatically */
  focus: () => void;
  /** Blur the input programmatically */
  blur: () => void;
  /** Clear the input value */
  clear: () => void;
  /** Set the input value programmatically */
  setValue: (value: string) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Get keyboard type based on input type
 */
function getKeyboardType(
  type?: UseInputProps['type']
): InputProps['keyboardType'] {
  switch (type) {
    case 'email':
      return 'email-address';
    case 'number':
      return 'numeric';
    case 'phone':
      return 'phone-pad';
    case 'url':
      return 'url';
    case 'search':
      return 'web-search';
    default:
      return 'default';
  }
}

/**
 * Get text content type for iOS autofill
 */
function getTextContentType(
  type?: UseInputProps['type'],
  autoComplete?: UseInputProps['autoComplete']
): InputProps['textContentType'] {
  if (autoComplete) {
    switch (autoComplete) {
      case 'username':
        return 'username';
      case 'password':
        return 'password';
      case 'email':
        return 'emailAddress';
      case 'name':
        return 'name';
      case 'tel':
        return 'telephoneNumber';
      case 'street-address':
        return 'streetAddressLine1';
      case 'postal-code':
        return 'postalCode';
      case 'cc-number':
        return 'creditCardNumber';
      default:
        return undefined;
    }
  }

  switch (type) {
    case 'email':
      return 'emailAddress';
    case 'phone':
      return 'telephoneNumber';
    case 'url':
      return 'URL';
    default:
      return undefined;
  }
}

/**
 * Get return key type based on input type
 */
function getReturnKeyType(type?: UseInputProps['type']): InputProps['returnKeyType'] {
  switch (type) {
    case 'search':
      return 'search';
    default:
      return 'done';
  }
}

/**
 * Hook for managing text input behavior and accessibility
 *
 * @param props - Configuration options for the input
 * @returns Object containing input props, label props, error props, state, and control methods
 */
export function useInput<T extends string = string>(
  props: UseInputProps<T> = {}
): UseInputReturn {
  const {
    value: controlledValue,
    defaultValue = '' as T,
    onChange,
    onFocus,
    onBlur,
    onSubmit,
    disabled = false,
    readOnly = false,
    required = false,
    error,
    placeholder,
    type = 'text',
    maxLength,
    accessibilityLabel,
    accessibilityHint,
    id: providedId,
    autoComplete,
    autoCapitalize = type === 'email' ? 'none' : 'sentences',
    autoCorrect = type !== 'email' && type !== 'password',
    autoFocus = false,
  } = props;

  // Generate unique IDs
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;

  // Determine if component is controlled
  const isControlled = controlledValue !== undefined;

  // Internal state
  const [internalValue, setInternalValue] = useState(String(defaultValue));
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  // Reference to the input for focus/blur methods
  const inputRef = useRef<{ focus: () => void; blur: () => void } | null>(null);

  // Computed values
  const value = isControlled ? String(controlledValue) : internalValue;
  const hasError = Boolean(error);
  const isDirty = value !== String(defaultValue);

  /**
   * Handle value changes
   */
  const handleChangeText = useCallback(
    (text: string) => {
      if (disabled || readOnly) return;

      // Enforce maxLength
      const newValue = maxLength ? text.slice(0, maxLength) : text;

      // Update internal state if uncontrolled
      if (!isControlled) {
        setInternalValue(newValue);
      }

      // Call onChange callback
      onChange?.(newValue as T);
    },
    [disabled, readOnly, maxLength, isControlled, onChange]
  );

  /**
   * Handle focus events
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setIsTouched(true);
    onFocus?.();
  }, [onFocus]);

  /**
   * Handle blur events
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  /**
   * Handle submit events
   */
  const handleSubmitEditing = useCallback(() => {
    onSubmit?.();
  }, [onSubmit]);

  /**
   * Handle label press to focus input
   */
  const handleLabelPress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Focus the input programmatically
   */
  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Blur the input programmatically
   */
  const blur = useCallback(() => {
    inputRef.current?.blur();
  }, []);

  /**
   * Clear the input value
   */
  const clear = useCallback(() => {
    if (disabled || readOnly) return;

    if (!isControlled) {
      setInternalValue('');
    }

    onChange?.('' as T);
  }, [disabled, readOnly, isControlled, onChange]);

  /**
   * Set the input value programmatically
   */
  const setValue = useCallback(
    (newValue: string) => {
      if (disabled || readOnly) return;

      const processedValue = maxLength ? newValue.slice(0, maxLength) : newValue;

      if (!isControlled) {
        setInternalValue(processedValue);
      }

      onChange?.(processedValue as T);
    },
    [disabled, readOnly, maxLength, isControlled, onChange]
  );

  // Input state object
  const state: InputState = {
    value,
    isFocused,
    hasError,
    isDisabled: disabled,
    isReadOnly: readOnly,
    isTouched,
    isDirty,
    characterCount: value.length,
  };

  // Props to spread on the input element
  const inputProps: InputProps = {
    accessibilityRole: 'none',
    accessibilityState: {
      disabled,
    },
    accessibilityLabel,
    accessibilityHint,
    editable: !disabled && !readOnly,
    value,
    onChangeText: handleChangeText,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onSubmitEditing: handleSubmitEditing,
    placeholder,
    maxLength,
    secureTextEntry: type === 'password',
    keyboardType: getKeyboardType(type),
    autoCapitalize,
    autoCorrect,
    autoFocus,
    textContentType: getTextContentType(type, autoComplete),
    autoComplete,
    returnKeyType: getReturnKeyType(type),
    id,
    nativeID: id,
    'aria-invalid': hasError,
    'aria-disabled': disabled,
    'aria-required': required ? true : undefined,
    'aria-describedby': hasError ? errorId : undefined,
    'aria-labelledby': labelId,
  };

  // Props to spread on the label element
  const labelProps: LabelProps = {
    nativeID: labelId,
    onPress: handleLabelPress,
    accessibilityRole: 'text',
  };

  // Props to spread on the error element
  const errorProps: ErrorProps = {
    nativeID: errorId,
    role: 'alert',
    accessibilityRole: 'alert',
    accessibilityLiveRegion: 'polite',
  };

  return {
    inputProps,
    labelProps,
    errorProps,
    state,
    focus,
    blur,
    clear,
    setValue,
  };
}

export default useInput;

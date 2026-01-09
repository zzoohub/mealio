/**
 * Input - Styled text input component
 *
 * Combines the useInput headless hook with design tokens
 * to create a fully accessible, themed text input component.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   placeholder="Enter your email"
 *   type="email"
 * />
 *
 * <Input
 *   label="Password"
 *   placeholder="Enter your password"
 *   type="password"
 *   error="Password must be at least 8 characters"
 * />
 *
 * <Input
 *   variant="filled"
 *   label="Search"
 *   leadingIcon={<SearchIcon />}
 *   trailingElement={<ClearButton />}
 * />
 * ```
 */

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  type ViewStyle,
  type TextStyle,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  interpolateColor,
} from 'react-native-reanimated';
import { useInput, type UseInputProps } from '../headless';
import { tokens } from '../tokens';
import { createStyles, useStyles } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export type InputVariant = 'outline' | 'filled';

export interface InputProps extends UseInputProps {
  /** Visual variant of the input */
  variant?: InputVariant;
  /** Label text displayed above the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Icon or element to display at the start of the input */
  leadingIcon?: React.ReactNode;
  /** Icon or element to display at the end of the input */
  trailingElement?: React.ReactNode;
  /** Custom style for the container */
  style?: ViewStyle;
  /** Custom style for the input */
  inputStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
  /** Whether to show character count */
  showCharacterCount?: boolean;
}

export interface InputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

// =============================================================================
// ANIMATED VIEW
// =============================================================================

const AnimatedView = Animated.createAnimatedComponent(View);

// =============================================================================
// COMPONENT
// =============================================================================

export const Input = forwardRef<InputRef, InputProps>(function Input(
  {
    variant = 'outline',
    label,
    helperText,
    leadingIcon,
    trailingElement,
    style,
    inputStyle,
    testID,
    showCharacterCount = false,
    ...hookProps
  },
  ref
) {
  const s = useStyles(styles);
  const {
    inputProps,
    labelProps,
    errorProps,
    state,
    focus,
    blur,
    clear,
  } = useInput(hookProps);
  const { isFocused, hasError, isDisabled, characterCount } = state;

  // Internal ref for TextInput
  const inputRef = useRef<TextInput>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear,
  }));

  // Animation for focus state
  const focusProgress = useSharedValue(0);

  React.useEffect(() => {
    focusProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: tokens.duration.fast,
    });
  }, [isFocused, focusProgress]);

  // Get variant-specific styles
  const getVariantStyles = (): {
    container: ViewStyle;
    focused: ViewStyle;
    error: ViewStyle;
  } => {
    switch (variant) {
      case 'outline':
        return {
          container: s.outlineContainer,
          focused: s.outlineFocused,
          error: s.outlineError,
        };
      case 'filled':
        return {
          container: s.filledContainer,
          focused: s.filledFocused,
          error: s.filledError,
        };
      default:
        return {
          container: {},
          focused: {},
          error: {},
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Animated border color
  const animatedBorderStyle = useAnimatedStyle(() => {
    const defaultColor = hasError
      ? (s.outlineError.borderColor as string)
      : (s.outlineContainer.borderColor as string);
    const focusedColor = hasError
      ? (s.outlineError.borderColor as string)
      : (s.borderFocus.borderColor as string);

    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      [defaultColor, focusedColor]
    );

    if (variant === 'filled') {
      return { borderBottomColor: borderColor };
    }
    return { borderColor };
  });

  // Error message from props
  const errorMessage = typeof hookProps.error === 'string' ? hookProps.error : undefined;

  // Handle label press to focus input
  const handleLabelPress = () => {
    inputRef.current?.focus();
  };

  // Icon color based on state
  const iconColor = isDisabled
    ? (s.iconDisabled.color as string)
    : isFocused
    ? (s.iconFocused.color as string)
    : (s.iconDefault.color as string);

  // Render icon with proper styling
  const renderLeadingIcon = () => {
    if (!leadingIcon) return null;
    return (
      <View style={s.leadingIcon}>
        {React.isValidElement(leadingIcon)
          ? React.cloneElement(leadingIcon as React.ReactElement<{ color?: string; size?: number }>, {
              color: iconColor,
              size: tokens.size.icon.sm,
            })
          : leadingIcon}
      </View>
    );
  };

  const renderTrailingElement = () => {
    if (!trailingElement) return null;
    return <View style={s.trailingElement}>{trailingElement}</View>;
  };

  return (
    <View style={[s.container, style]} testID={testID}>
      {/* Label */}
      {label && (
        <Pressable onPress={handleLabelPress}>
          <Text
            {...labelProps}
            style={[
              s.label,
              hasError && s.labelError,
              isDisabled && s.labelDisabled,
            ]}
          >
            {label}
            {hookProps.required && (
              <Text style={s.requiredAsterisk}> *</Text>
            )}
          </Text>
        </Pressable>
      )}

      {/* Input container */}
      <AnimatedView
        style={[
          s.inputContainer,
          variantStyles.container,
          isFocused && variantStyles.focused,
          hasError && variantStyles.error,
          isDisabled && s.disabled,
          animatedBorderStyle,
        ]}
      >
        {renderLeadingIcon()}

        <TextInput
          ref={inputRef}
          {...inputProps}
          style={[
            s.input,
            leadingIcon ? s.inputWithLeading : undefined,
            trailingElement ? s.inputWithTrailing : undefined,
            isDisabled ? s.inputDisabled : undefined,
            inputStyle,
          ]}
          placeholderTextColor={s.placeholderColor.color as string}
          selectionColor={s.selectionColor.color as string}
          cursorColor={s.selectionColor.color as string}
        />

        {renderTrailingElement()}
      </AnimatedView>

      {/* Helper text / Error message / Character count */}
      <View style={s.bottomRow}>
        <View style={s.messageContainer}>
          {hasError && errorMessage ? (
            <Text {...errorProps} style={s.errorText}>
              {errorMessage}
            </Text>
          ) : helperText ? (
            <Text style={s.helperText}>
              {helperText}
            </Text>
          ) : null}
        </View>

        {showCharacterCount && hookProps.maxLength && (
          <Text
            style={[
              s.characterCount,
              characterCount >= hookProps.maxLength && s.characterCountError,
            ]}
          >
            {characterCount}/{hookProps.maxLength}
          </Text>
        )}
      </View>
    </View>
  );
});

export default Input;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    width: '100%',
  },
  label: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: tokens.typography.fontSize.bodySmall * tokens.typography.lineHeight.ui,
    marginBottom: tokens.spacing.component.xs,
    color: colors.text.secondary,
  },
  labelError: {
    color: colors.status.error,
  },
  labelDisabled: {
    color: colors.text.disabled,
  },
  requiredAsterisk: {
    color: colors.status.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.md,
    minHeight: tokens.size.touchTarget.md,
  },
  input: {
    flex: 1,
    fontSize: tokens.typography.fontSize.body,
    lineHeight: tokens.typography.fontSize.body * tokens.typography.lineHeight.ui,
    paddingHorizontal: tokens.spacing.component.md,
    paddingVertical: tokens.spacing.component.sm,
    minHeight: tokens.size.touchTarget.md,
    color: colors.text.primary,
  },
  inputWithLeading: {
    paddingLeft: 0,
  },
  inputWithTrailing: {
    paddingRight: 0,
  },
  inputDisabled: {
    color: colors.text.disabled,
  },
  leadingIcon: {
    paddingLeft: tokens.spacing.component.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailingElement: {
    paddingRight: tokens.spacing.component.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: tokens.spacing.component.xs,
    minHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.ui,
  },
  messageContainer: {
    flex: 1,
  },
  helperText: {
    fontSize: tokens.typography.fontSize.caption,
    lineHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.ui,
    color: colors.text.tertiary,
  },
  errorText: {
    fontSize: tokens.typography.fontSize.caption,
    lineHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.ui,
    color: colors.status.error,
  },
  characterCount: {
    fontSize: tokens.typography.fontSize.caption,
    lineHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.ui,
    marginLeft: tokens.spacing.component.sm,
    color: colors.text.tertiary,
  },
  characterCountError: {
    color: colors.status.error,
  },
  disabled: {
    opacity: tokens.opacity.disabled,
  },
  // Variant styles - outline
  outlineContainer: {
    backgroundColor: colors.bg.primary,
    borderWidth: tokens.borderWidth.default,
    borderColor: colors.border.default,
  },
  outlineFocused: {
    borderColor: colors.border.focus,
    borderWidth: tokens.borderWidth.focus,
  },
  outlineError: {
    borderColor: colors.status.error,
  },
  // Variant styles - filled
  filledContainer: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 0,
    borderBottomWidth: tokens.borderWidth.thick,
    borderBottomColor: colors.border.default,
    borderRadius: tokens.radius.sm,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  filledFocused: {
    borderBottomColor: colors.border.focus,
  },
  filledError: {
    borderBottomColor: colors.status.error,
  },
  // Color values for animations and dynamic styling
  placeholderColor: {
    color: colors.text.tertiary,
  },
  selectionColor: {
    color: colors.interactive.primary,
  },
  borderFocus: {
    borderColor: colors.border.focus,
  },
  iconDefault: {
    color: colors.text.tertiary,
  },
  iconFocused: {
    color: colors.border.focus,
  },
  iconDisabled: {
    color: colors.text.disabled,
  },
}));

import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  Dimensions,
  Text as RNText,
} from "react-native";
import * as Haptics from "expo-haptics";
import { createStyles, useStyles } from "@/design-system/theme";
import { Box, Text } from "@/design-system/styled";
import { tokens } from "@/design-system/tokens";
import { VALIDATION_PATTERNS } from "@/constants";

interface VerificationInputProps {
  length?: number;
  value: string;
  onChangeText: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: string | undefined;
  disabled?: boolean;
  autoFocus?: boolean;
}

const { width: screenWidth } = Dimensions.get("window");
const cellSize = Math.min((screenWidth - 48 - 60) / 6, 56);

export function VerificationInput({
  length = 6,
  value,
  onChangeText,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
}: VerificationInputProps) {
  const s = useStyles(styles);

  const [focusedIndex, setFocusedIndex] = useState(autoFocus ? 0 : -1);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Split the value into individual digits
  const digits = value.split("").slice(0, length);
  while (digits.length < length) {
    digits.push("");
  }

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    // Auto-submit when code is complete
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  useEffect(() => {
    // Haptic feedback on error
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [error]);

  const handleChangeText = (text: string, index: number) => {
    // Only allow digits
    const digit = text.replace(/\D/g, "").slice(-1);

    // Create new code array
    const newDigits = [...digits];
    newDigits[index] = digit;

    // Update the code
    const newCode = newDigits.join("");
    onChangeText(newCode);

    // Move to next input or handle completion
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    } else if (digit && index === length - 1) {
      // Last digit entered, blur to trigger completion
      inputRefs.current[index]?.blur();
      setFocusedIndex(-1);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace") {
      if (!digits[index] && index > 0) {
        // If current input is empty and backspace is pressed, move to previous input
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(-1);
  };

  const handleCellPress = (index: number) => {
    if (!disabled) {
      inputRefs.current[index]?.focus();
    }
  };

  const isValid = value.length === 0 || VALIDATION_PATTERNS.VERIFICATION_CODE.test(value);
  const hasError = !!error || (!isValid && value.length > 0);

  return (
    <Box style={s.container}>
      <View style={s.inputContainer}>
        {digits.map((digit, index) => {
          const isFocused = focusedIndex === index;
          const hasValue = digit !== "";

          return (
            <View key={index} style={s.cellContainer}>
              <Pressable
                onPress={() => handleCellPress(index)}
                style={[
                  s.cell,
                  (isFocused || hasValue) && s.cellHasValue,
                  isFocused && s.cellFocused,
                  hasError && s.cellError,
                  disabled && s.cellDisabled,
                ]}
              >
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={s.input}
                  value={digit}
                  onChangeText={(text) => handleChangeText(text, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  onFocus={() => handleFocus(index)}
                  onBlur={handleBlur}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={1}
                  editable={!disabled}
                  selectTextOnFocus
                  caretHidden
                  blurOnSubmit={false}
                  autoCorrect={false}
                  autoCapitalize="none"
                />

                {/* Visual digit display */}
                <View style={s.digitDisplay}>
                  <RNText style={[s.digitText, !hasValue && s.digitHidden]}>{digit}</RNText>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Error message container - Reserve space to prevent layout shift */}
      <View style={s.errorContainer}>
        {error && <Text style={s.errorText}>{error}</Text>}

        {!isValid && !error && value.length > 0 && (
          <Text style={s.errorText}>Please enter a valid 6-digit code</Text>
        )}
      </View>
    </Box>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    alignItems: "center" as const,
    width: "100%" as const,
  },
  inputContainer: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: tokens.spacing.component.md,
  },
  cellContainer: {
    position: "relative" as const,
  },
  cell: {
    width: cellSize,
    height: cellSize,
    borderWidth: tokens.borderWidth.thick,
    borderRadius: tokens.radius.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "relative" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  cellFocused: {
    borderColor: colors.interactive.primary,
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.1,
  },
  cellHasValue: {
    borderColor: colors.interactive.primary,
  },
  cellError: {
    borderColor: colors.status.error,
  },
  cellDisabled: {
    opacity: tokens.opacity.disabled,
  },
  input: {
    position: "absolute" as const,
    width: "100%" as const,
    height: "100%" as const,
    textAlign: "center" as const,
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.semibold,
    opacity: 0, // Hide the actual input, show the digit display instead
    color: colors.text.primary,
  },
  digitDisplay: {
    position: "absolute" as const,
    width: "100%" as const,
    height: "100%" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    pointerEvents: "none" as const,
  },
  digitText: {
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.semibold,
    textAlign: "center" as const,
    color: colors.text.primary,
  },
  digitHidden: {
    opacity: 0,
  },
  errorContainer: {
    minHeight: 40,
    marginTop: tokens.spacing.component.lg,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  errorText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    textAlign: "center" as const,
    lineHeight: tokens.typography.fontSize.bodySmall * tokens.typography.lineHeight.body,
    color: colors.status.error,
  },
}));

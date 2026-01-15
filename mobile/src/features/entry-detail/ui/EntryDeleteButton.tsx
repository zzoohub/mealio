/**
 * EntryDeleteButton - Destructive delete action for entry detail page
 *
 * A full-width text button for deleting an entry.
 * Uses red/danger color scheme to indicate destructive action.
 *
 * @example
 * ```tsx
 * <EntryDeleteButton
 *   onPress={() => showDeleteConfirmation()}
 *   loading={isDeleting}
 * />
 * ```
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles } from '@/shared/ui/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface EntryDeleteButtonProps {
  /** Callback when delete button is pressed */
  onPress?: (() => void) | undefined;
  /** Whether delete operation is in progress */
  loading?: boolean | undefined;
  /** Whether the button should be disabled */
  disabled?: boolean | undefined;
  /** Custom label text */
  label?: string | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_LABEL = 'Delete Entry';

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryDeleteButton({
  onPress,
  loading = false,
  disabled = false,
  label = DEFAULT_LABEL,
  testID,
}: EntryDeleteButtonProps) {
  const s = useStyles(styles);
  const insets = useSafeAreaInsets();
  const isDisabled = disabled || loading;

  return (
    <View
      style={[s.container, { paddingBottom: Math.max(insets.bottom, tokens.spacing.component.lg) }]}
      testID={testID}
    >
      {/* Delete Button */}
      <TouchableOpacity
        style={[s.button, isDisabled && s.buttonDisabled]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        accessibilityHint="Double tap to delete this entry"
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={s.loadingIndicator.color as string}
            accessibilityLabel="Deleting entry"
          />
        ) : (
          <Text style={[s.buttonText, isDisabled && s.buttonTextDisabled]}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default EntryDeleteButton;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.md,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: tokens.size.touchTarget.md,
    paddingVertical: tokens.spacing.component.md,
  },
  buttonDisabled: {
    opacity: tokens.opacity.disabled,
  },
  buttonText: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.status.error,
  },
  buttonTextDisabled: {
    color: colors.text.disabled,
  },
  loadingIndicator: {
    color: colors.status.error,
  },
}));

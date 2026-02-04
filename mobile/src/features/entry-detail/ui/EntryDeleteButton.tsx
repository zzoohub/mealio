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
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles } from '@/shared/ui/theme';
import { useDiaryI18n } from '@/shared/lib/i18n';

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

// Label resolved via i18n in the component

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryDeleteButton({
  onPress,
  loading = false,
  disabled = false,
  label: labelProp,
  testID,
}: EntryDeleteButtonProps) {
  const s = useStyles(styles);
  const insets = useSafeAreaInsets();
  const diary = useDiaryI18n();
  const label = labelProp ?? diary.deleteEntry;
  const isDisabled = disabled || loading;

  return (
    <View
      style={[s.container, { paddingBottom: Math.max(insets.bottom, tokens.spacing.component.lg) }]}
      testID={testID}
    >
      {/* Delete Button */}
      <Pressable
        style={[s.button, isDisabled && s.buttonDisabled]}
        onPress={onPress}
        disabled={isDisabled}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        accessibilityHint={diary.deleteEntryHint}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={s.loadingIndicator.color as string}
            accessibilityLabel={diary.deletingEntry}
          />
        ) : (
          <Text style={[s.buttonText, isDisabled && s.buttonTextDisabled]}>
            {label}
          </Text>
        )}
      </Pressable>
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

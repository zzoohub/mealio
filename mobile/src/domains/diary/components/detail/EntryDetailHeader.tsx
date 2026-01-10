/**
 * EntryDetailHeader - Header component for entry detail page
 *
 * Pure UI component with back button.
 * Edit button is optional (shown only if onEditPress is provided).
 * Provides 44pt minimum touch targets for accessibility.
 *
 * @example
 * ```tsx
 * <EntryDetailHeader
 *   onBackPress={() => navigation.goBack()}
 * />
 * ```
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/design-system/tokens';
import { createStyles, useStyles } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface EntryDetailHeaderProps {
  /** Callback when back button is pressed */
  onBackPress?: (() => void) | undefined;
  /** Callback when edit button is pressed (optional - hides button if not provided) */
  onEditPress?: (() => void) | undefined;
  /** Whether edit button should be disabled */
  editDisabled?: boolean | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const HEADER_HEIGHT = 48;

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryDetailHeader({
  onBackPress,
  onEditPress,
  editDisabled = false,
  testID,
}: EntryDetailHeaderProps) {
  const s = useStyles(styles);

  return (
    <View style={s.container} testID={testID}>
      {/* Back Button */}
      <TouchableOpacity
        style={s.backButton}
        onPress={onBackPress}
        activeOpacity={0.7}
        accessibilityLabel="뒤로 가기"
        accessibilityRole="button"
      >
        <Ionicons
          name="chevron-back"
          size={tokens.size.icon.md}
          color={s.iconColor.color as string}
        />
      </TouchableOpacity>

      {/* Spacer */}
      <View style={s.spacer} />

      {/* Edit Button - Only shown if onEditPress is provided */}
      {onEditPress && (
        <TouchableOpacity
          style={[s.editButton, editDisabled && s.editButtonDisabled]}
          onPress={onEditPress}
          disabled={editDisabled}
          activeOpacity={0.7}
          accessibilityLabel="수정"
          accessibilityRole="button"
          accessibilityState={{ disabled: editDisabled }}
        >
          <Text style={[s.editText, editDisabled && s.editTextDisabled]}>
            수정
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default EntryDetailHeader;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_HEIGHT,
    paddingHorizontal: tokens.spacing.component.sm,
  },
  backButton: {
    width: tokens.size.touchTarget.md,
    height: tokens.size.touchTarget.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  editButton: {
    minWidth: tokens.size.touchTarget.md,
    height: tokens.size.touchTarget.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.component.md,
  },
  editButtonDisabled: {
    opacity: tokens.opacity.disabled,
  },
  editText: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.interactive.primary,
  },
  editTextDisabled: {
    color: colors.text.disabled,
  },
  iconColor: {
    color: colors.text.primary,
  },
}));

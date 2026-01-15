/**
 * EntryNotesSection - Editable notes/memo section with feedback
 *
 * Inline editable text area for user's personal notes.
 * Includes rating (thumbs 1-5) and "would eat again" (heart) at the bottom.
 * Auto-saves on blur.
 *
 * @example
 * ```tsx
 * <EntryNotesSection
 *   notes="Really enjoyed this pasta dish!"
 *   rating={4}
 *   wouldEatAgain={true}
 *   onNotesChange={(notes) => updateEntry({ notes })}
 *   onRatingChange={(rating) => updateEntry({ rating })}
 *   onWouldEatAgainChange={(value) => updateEntry({ wouldEatAgain: value })}
 * />
 * ```
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles, useTheme } from '@/shared/ui/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface EntryNotesSectionProps {
  /** User's notes about the entry */
  notes?: string | null | undefined;
  /** Placeholder text when notes are empty */
  placeholder?: string | undefined;
  /** Current rating (1-5 thumbs) */
  rating?: number | null | undefined;
  /** Whether user would eat again */
  wouldEatAgain?: boolean | null | undefined;
  /** Callback when notes change (called on blur) */
  onNotesChange?: ((notes: string) => void) | undefined;
  /** Callback when rating changes */
  onRatingChange?: ((rating: number) => void) | undefined;
  /** Callback when wouldEatAgain changes */
  onWouldEatAgainChange?: ((value: boolean) => void) | undefined;
  /** Whether editing is disabled */
  disabled?: boolean | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_PLACEHOLDER = '메모를 작성해보세요...';
const THUMBS_COUNT = 5;

// =============================================================================
// COMPONENT
// =============================================================================

export function EntryNotesSection({
  notes,
  placeholder = DEFAULT_PLACEHOLDER,
  rating,
  wouldEatAgain,
  onNotesChange,
  onRatingChange,
  onWouldEatAgainChange,
  disabled = false,
  testID,
}: EntryNotesSectionProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes || '');

  // Sync local state with prop
  useEffect(() => {
    setLocalNotes(notes || '');
  }, [notes]);

  const hasNotes = localNotes.trim().length > 0;

  const handlePress = () => {
    if (disabled) return;
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localNotes !== (notes || '')) {
      onNotesChange?.(localNotes);
    }
  };

  const handleThumbPress = (thumbIndex: number) => {
    if (disabled || !onRatingChange) return;
    // If tapping the same thumb, clear rating
    const newRating = rating === thumbIndex ? 0 : thumbIndex;
    onRatingChange(newRating);
  };

  const handleHeartPress = () => {
    if (disabled || !onWouldEatAgainChange) return;
    onWouldEatAgainChange(!wouldEatAgain);
  };

  // Feedback row component (thumbs + heart)
  const FeedbackRow = () => (
    <View style={s.feedbackRow}>
      {/* Thumbs Rating */}
      <View style={s.thumbsContainer}>
        {Array.from({ length: THUMBS_COUNT }, (_, index) => {
          const thumbValue = index + 1;
          const isFilled = rating ? thumbValue <= rating : false;

          return (
            <TouchableOpacity
              key={thumbValue}
              onPress={() => handleThumbPress(thumbValue)}
              disabled={disabled}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityLabel={`${thumbValue}점`}
              accessibilityRole="button"
            >
              <Ionicons
                name={isFilled ? 'thumbs-up' : 'thumbs-up-outline'}
                size={20}
                color={isFilled ? colors.interactive.primary : colors.text.tertiary}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bookmark Toggle */}
      <TouchableOpacity
        onPress={handleHeartPress}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="또 먹고 싶어요"
        accessibilityRole="button"
        accessibilityState={{ checked: !!wouldEatAgain }}
      >
        <Ionicons
          name={wouldEatAgain ? 'bookmark' : 'bookmark-outline'}
          size={18}
          color={wouldEatAgain ? colors.interactive.primary : colors.text.tertiary}
        />
      </TouchableOpacity>
    </View>
  );

  // Show TextInput when editing
  if (isEditing) {
    return (
      <View style={s.container} testID={testID}>
        <TextInput
          ref={inputRef}
          style={s.textInput}
          value={localNotes}
          onChangeText={setLocalNotes}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          multiline
          textAlignVertical="top"
          autoFocus
          accessibilityLabel="메모 입력"
        />
        <FeedbackRow />
      </View>
    );
  }

  return (
    <View style={s.container} testID={testID}>
      <TouchableOpacity
        style={s.notesArea}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={hasNotes ? `메모: ${localNotes}` : '메모 없음, 탭하여 입력'}
        accessibilityRole="button"
      >
        <Text style={[s.notesText, !hasNotes && s.placeholderText]}>
          {hasNotes ? localNotes : placeholder}
        </Text>
      </TouchableOpacity>
      <FeedbackRow />
    </View>
  );
}

export default EntryNotesSection;

// =============================================================================
// STYLES
// =============================================================================

// Minimum height for notes area
const NOTES_MIN_HEIGHT = 100;

const styles = createStyles((colors) => ({
  container: {
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.md,
    borderBottomWidth: tokens.borderWidth.default,
    borderBottomColor: colors.border.default,
  },
  notesArea: {
    minHeight: NOTES_MIN_HEIGHT,
  },
  notesText: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    lineHeight: tokens.typography.fontSize.body * tokens.typography.lineHeight.body,
    color: colors.text.primary,
  },
  placeholderText: {
    color: colors.text.tertiary,
  },
  textInput: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    lineHeight: tokens.typography.fontSize.body * tokens.typography.lineHeight.body,
    color: colors.text.primary,
    minHeight: NOTES_MIN_HEIGHT,
    padding: 0,
    margin: 0,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.spacing.component.md,
    paddingTop: tokens.spacing.component.sm,
    height: 32,
  },
  thumbsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.component.md,
  },
}));

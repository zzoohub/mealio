/**
 * AICommentBanner - Displays AI's witty one-liner comment
 *
 * Shows the AI-generated comment about the meal in a subtle banner style.
 * Hidden when no comment is available.
 *
 * @example
 * ```tsx
 * <AICommentBanner comment="오늘도 탄수화물 폭격이네요 🍚" />
 * ```
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles } from '@/shared/ui/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface AICommentBannerProps {
  /** AI-generated comment */
  comment?: string | null | undefined;
  /** Test ID for testing */
  testID?: string | undefined;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AICommentBanner({ comment, testID }: AICommentBannerProps) {
  const s = useStyles(styles);

  if (!comment) return null;

  return (
    <View style={s.container} testID={testID}>
      <Ionicons
        name="sparkles"
        size={tokens.size.icon.xs}
        color={s.icon.color as string}
      />
      <Text style={s.comment} numberOfLines={2}>
        {comment}
      </Text>
    </View>
  );
}

export default AICommentBanner;

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.component.sm,
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.md,
    backgroundColor: colors.bg.secondary,
    borderBottomWidth: tokens.borderWidth.default,
    borderBottomColor: colors.border.default,
  },
  icon: {
    color: colors.interactive.primary,
  },
  comment: {
    flex: 1,
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.normal,
    fontStyle: 'italic',
    lineHeight: tokens.typography.fontSize.bodySmall * tokens.typography.lineHeight.body,
    color: colors.text.secondary,
  },
}));

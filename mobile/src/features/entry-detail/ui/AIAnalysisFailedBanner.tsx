import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles } from '@/shared/ui/theme';
import { useDiaryI18n, useCommonI18n } from '@/shared/lib/i18n';

export interface AIAnalysisFailedBannerProps {
  onRetry: () => void;
  testID?: string;
}

export function AIAnalysisFailedBanner({ onRetry, testID }: AIAnalysisFailedBannerProps) {
  const s = useStyles(styles);
  const diary = useDiaryI18n();
  const common = useCommonI18n();

  return (
    <View style={s.container} testID={testID}>
      <Ionicons
        name="alert-circle-outline"
        size={tokens.size.icon.xs}
        color={s.icon.color as string}
      />
      <Text style={s.text}>{diary.aiAnalysisFailed}</Text>
      <Pressable onPress={onRetry} hitSlop={8}>
        <Text style={s.retryText}>{common.retry}</Text>
      </Pressable>
    </View>
  );
}

const styles = createStyles((colors) => ({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: tokens.spacing.component.sm,
    paddingHorizontal: tokens.spacing.component.lg,
    paddingVertical: tokens.spacing.component.md,
    backgroundColor: colors.bg.secondary,
    borderBottomWidth: tokens.borderWidth.default,
    borderBottomColor: colors.border.default,
  },
  icon: {
    color: colors.status.error,
  },
  text: {
    flex: 1,
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.normal,
    lineHeight: tokens.typography.fontSize.bodySmall * tokens.typography.lineHeight.body,
    color: colors.text.secondary,
  },
  retryText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: colors.interactive.primary,
  },
}));

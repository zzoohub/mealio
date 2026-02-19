import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { tokens } from '@/shared/ui/tokens';
import { createStyles, useStyles } from '@/shared/ui/theme';
import { useDiaryI18n } from '@/shared/lib/i18n';

export interface AIAnalysisLoadingBannerProps {
  testID?: string;
}

export function AIAnalysisLoadingBanner({ testID }: AIAnalysisLoadingBannerProps) {
  const s = useStyles(styles);
  const diary = useDiaryI18n();

  return (
    <View style={s.container} testID={testID}>
      <ActivityIndicator size="small" color={s.spinner.color as string} />
      <Text style={s.text}>{diary.aiAnalyzing}</Text>
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
  spinner: {
    color: colors.interactive.primary,
  },
  text: {
    flex: 1,
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.normal,
    lineHeight: tokens.typography.fontSize.bodySmall * tokens.typography.lineHeight.body,
    color: colors.text.secondary,
  },
}));

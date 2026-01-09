import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createStyles, useStyles } from '@/design-system/theme';
import { Box, Text, VStack, Divider } from '@/design-system/styled';
import { Card } from '@/design-system/styled';
import { tokens } from '@/design-system/tokens';

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
  footer?: string;
  style?: any;
  variant?: 'default' | 'grouped';
}

export function SettingsSection({
  title,
  children,
  footer,
  style,
  variant = 'default',
}: SettingsSectionProps) {
  const s = useStyles(styles);

  if (variant === 'grouped') {
    return (
      <View style={[s.container, style]}>
        {title && <Text style={s.sectionTitle}>{title}</Text>}
        <Card variant="filled" style={s.groupedCard}>
          {React.Children.map(children, (child, index) => {
            const isLast = index === React.Children.count(children) - 1;
            return (
              <View>
                {child}
                {!isLast && <View style={s.divider} />}
              </View>
            );
          })}
        </Card>
        {footer && <Text style={s.footer}>{footer}</Text>}
      </View>
    );
  }

  return (
    <View style={[s.container, style]}>
      {title && <Text style={s.sectionTitle}>{title}</Text>}
      <View style={s.content}>{children}</View>
      {footer && <Text style={s.footer}>{footer}</Text>}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    marginBottom: tokens.spacing.layout.lg,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.md,
    marginHorizontal: tokens.spacing.component.xs,
    color: colors.text.primary,
  },
  content: {
    gap: 0,
  },
  groupedCard: {
    borderRadius: tokens.radius.md,
    overflow: 'hidden' as const,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56, // Align with text content, accounting for icon space
    backgroundColor: colors.border.divider,
  },
  footer: {
    fontSize: tokens.typography.fontSize.caption,
    lineHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.body,
    marginTop: tokens.spacing.component.sm,
    marginHorizontal: tokens.spacing.component.lg,
    color: colors.text.secondary,
  },
}));

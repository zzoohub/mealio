import React from 'react';
import { View, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, useStyles, useTheme } from '@/design-system/theme';
import { Box, Text, HStack } from '@/design-system/styled';
import { Card } from '@/design-system/styled';
import { tokens } from '@/design-system/tokens';
import * as Haptics from 'expo-haptics';

interface SettingsItemProps {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  type: 'toggle' | 'select' | 'navigation' | 'info';
  value?: any;
  onPress?: () => void;
  onValueChange?: (value: any) => void;
  disabled?: boolean;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  variant?: 'default' | 'grouped';
}

export function SettingsItem({
  title,
  description,
  icon,
  type,
  value,
  onPress,
  onValueChange,
  disabled = false,
  showChevron = true,
  rightElement,
  variant = 'default',
}: SettingsItemProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();

  const handlePress = () => {
    if (disabled) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptics feedback failed:', error);
    }

    if (type === 'toggle' && onValueChange) {
      onValueChange(!value);
    } else if (onPress) {
      onPress();
    }
  };

  const renderRightElement = () => {
    if (rightElement) {
      return rightElement;
    }

    switch (type) {
      case 'toggle':
        return (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{
              false: colors.border.default,
              true: colors.interactive.primary + '40',
            }}
            thumbColor={value ? colors.interactive.primary : '#f4f3f4'}
            ios_backgroundColor={colors.border.default}
            disabled={disabled}
          />
        );
      case 'select':
        return (
          <View style={s.selectValue}>
            <Text style={s.valueText}>{value}</Text>
            {showChevron && (
              <Ionicons
                name="chevron-forward"
                size={tokens.size.icon.xs}
                color={colors.text.secondary}
                style={s.chevron}
              />
            )}
          </View>
        );
      case 'navigation':
        return showChevron ? (
          <Ionicons
            name="chevron-forward"
            size={tokens.size.icon.sm}
            color={colors.text.secondary}
          />
        ) : null;
      case 'info':
        return <Text style={s.infoText}>{value}</Text>;
      default:
        return null;
    }
  };

  const isInteractive = type !== 'info' && !disabled;

  const content = (
    <View
      style={[s.container, { opacity: disabled ? tokens.opacity.disabled : 1 }]}
    >
      <View style={s.leftSection}>
        {icon && (
          <View style={s.iconContainer}>
            <Ionicons
              name={icon}
              size={tokens.size.icon.sm}
              color={colors.interactive.primary}
            />
          </View>
        )}
        <View style={s.textContainer}>
          <Text style={s.title}>{title}</Text>
          {description && <Text style={s.description}>{description}</Text>}
        </View>
      </View>
      <View style={s.rightSection}>{renderRightElement()}</View>
    </View>
  );

  if (variant === 'grouped') {
    if (isInteractive) {
      return (
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
          disabled={disabled}
          style={s.groupedContainer}
        >
          {content}
        </TouchableOpacity>
      );
    }

    return <View style={s.groupedContainer}>{content}</View>;
  }

  // Default variant with Card
  if (isInteractive) {
    return (
      <Card variant="filled" style={s.card}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
          disabled={disabled}
        >
          {content}
        </TouchableOpacity>
      </Card>
    );
  }

  return (
    <Card variant="filled" style={s.card}>
      {content}
    </Card>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  card: {
    marginVertical: tokens.spacing.component.xs,
    padding: 0,
    overflow: 'hidden' as const,
  },
  groupedContainer: {
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: tokens.spacing.component.lg,
    minHeight: tokens.size.touchTarget.lg,
  },
  leftSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: tokens.spacing.component.md,
    backgroundColor: colors.interactive.primary + '20',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    marginBottom: 2,
    color: colors.text.primary,
  },
  description: {
    fontSize: tokens.typography.fontSize.caption,
    lineHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.body,
    color: colors.text.secondary,
  },
  rightSection: {
    marginLeft: tokens.spacing.component.md,
  },
  selectValue: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  valueText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  chevron: {
    marginLeft: tokens.spacing.component.xs,
  },
  infoText: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.text.secondary,
  },
}));

import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, useStyles, useTheme } from '@/shared/ui/theme';
import { Text, Card, Button } from '@/shared/ui/styled';
import { tokens } from '@/shared/ui/tokens';
import * as Haptics from 'expo-haptics';

interface SelectionOption {
  value: any;
  label: string;
  description?: string;
}

interface SelectionModalProps {
  title: string;
  options: SelectionOption[];
  selectedValue: any;
  onSelect: (value: any) => void;
  onClose: () => void;
}

export function SelectionModal({
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: SelectionModalProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();

  const handleSelect = (value: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptics feedback failed:', error);
    }

    onSelect(value);
    onClose();
  };

  const handleClose = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptics feedback failed:', error);
    }

    onClose();
  };

  const renderOption = (option: SelectionOption) => {
    const isSelected = option.value === selectedValue;

    return (
      <Card key={option.value} variant="filled" style={s.optionCard}>
        <TouchableOpacity
          style={s.optionContent}
          onPress={() => handleSelect(option.value)}
          activeOpacity={0.7}
        >
          <View style={s.optionLeft}>
            <Text style={s.optionLabel}>{option.label}</Text>
            {option.description && (
              <Text style={s.optionDescription}>{option.description}</Text>
            )}
          </View>
          {isSelected && (
            <Ionicons
              name="checkmark"
              size={tokens.size.icon.sm}
              color={colors.interactive.primary}
            />
          )}
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        <TouchableOpacity style={s.closeButton} onPress={handleClose}>
          <Ionicons
            name="close"
            size={tokens.size.icon.sm}
            color={colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content}>{options.map(renderOption)}</ScrollView>

      <View style={s.footer}>
        <Button variant="outline" size="lg" onPress={handleClose}>
          Cancel
        </Button>
      </View>
    </>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: tokens.spacing.component.lg,
    paddingBottom: tokens.spacing.component.sm,
  },
  title: {
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.bg.secondary,
  },
  content: {
    maxHeight: 400,
    padding: tokens.spacing.component.lg,
    paddingTop: tokens.spacing.component.sm,
  },
  optionCard: {
    marginBottom: tokens.spacing.component.sm,
    padding: 0,
    overflow: 'hidden' as const,
  },
  optionContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: tokens.spacing.component.lg,
    minHeight: tokens.size.touchTarget.lg,
  },
  optionLeft: {
    flex: 1,
  },
  optionLabel: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    marginBottom: 2,
    color: colors.text.primary,
  },
  optionDescription: {
    fontSize: tokens.typography.fontSize.caption,
    lineHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.body,
    color: colors.text.secondary,
  },
  footer: {
    padding: tokens.spacing.component.lg,
    paddingTop: tokens.spacing.component.sm,
  },
}));

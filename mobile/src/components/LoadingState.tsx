import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/design-system/theme';
import { tokens } from '@/design-system/tokens';
import type { BaseComponentProps } from '@/types';

interface LoadingStateProps extends BaseComponentProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export function LoadingState({
  message = 'Loading...',
  size = 'large',
  color,
  fullScreen = false,
  testID,
  style,
}: LoadingStateProps) {
  const { colors } = useTheme();

  const indicatorColor = color || colors.interactive.primary;
  const containerStyle = fullScreen ? styles.fullScreen : styles.inline;

  return (
    <View style={[containerStyle, style]} testID={testID}>
      <ActivityIndicator
        size={size}
        color={indicatorColor}
        testID={`${testID}-indicator`}
      />
      {message && (
        <Text
          style={[
            styles.messageText,
            { color: colors.text.secondary },
          ]}
          testID={`${testID}-message`}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.component.lg,
  },
  messageText: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.normal,
    marginTop: tokens.spacing.component.md,
    textAlign: 'center',
  },
});
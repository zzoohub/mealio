import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens, darkColors } from '@/shared/ui/tokens';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to crash reporting service
    this.logErrorToService(error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    } else {
      // In production, log to crash reporting service
      // crashlytics().recordError(error);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    // In a real app, you might want to restart the app
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color={tokens.color.interactive.primary}
              style={styles.icon}
            />
            
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.subtitle}>
              The app encountered an unexpected error. This has been reported to our team.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={this.handleRetry}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reloadButton}
                onPress={this.handleReload}
                activeOpacity={0.7}
              >
                <Ionicons name="reload" size={20} color={tokens.color.interactive.primary} />
                <Text style={styles.reloadButtonText}>Reload App</Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.debugContainer} showsVerticalScrollIndicator={false}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.debugText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.layout.sm,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  icon: {
    marginBottom: tokens.spacing.component.xl,
  },
  title: {
    color: darkColors.text.primary,
    fontSize: tokens.typography.fontSize.h2,
    fontWeight: tokens.typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: tokens.spacing.component.md,
  },
  subtitle: {
    color: darkColors.text.secondary,
    fontSize: tokens.typography.fontSize.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: tokens.spacing.layout.lg,
  },
  buttonContainer: {
    gap: tokens.spacing.component.lg,
    width: '100%',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.interactive.primary,
    paddingHorizontal: tokens.spacing.component.xl,
    paddingVertical: tokens.spacing.component.lg,
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing.component.sm,
  },
  retryButtonText: {
    color: 'white',
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: tokens.borderWidth.default,
    borderColor: tokens.color.interactive.primary,
    paddingHorizontal: tokens.spacing.component.xl,
    paddingVertical: tokens.spacing.component.lg,
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing.component.sm,
  },
  reloadButtonText: {
    color: tokens.color.interactive.primary,
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  debugContainer: {
    marginTop: tokens.spacing.component.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: tokens.spacing.component.lg,
    borderRadius: tokens.radius.md,
    maxHeight: 200,
    width: '100%',
  },
  debugTitle: {
    color: tokens.color.interactive.primary,
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.sm,
  },
  debugText: {
    color: darkColors.text.secondary,
    fontSize: tokens.typography.fontSize.caption,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});

export default ErrorBoundary;
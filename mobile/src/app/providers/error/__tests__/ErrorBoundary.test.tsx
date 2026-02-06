// Mock React Native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/shared/ui/tokens', () => ({
  tokens: {
    color: {
      interactive: {
        primary: '#007AFF',
      },
    },
    spacing: {
      component: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
      },
      layout: {
        sm: 16,
        lg: 24,
      },
    },
    typography: {
      fontSize: {
        h2: 24,
        body: 16,
        bodySmall: 14,
        caption: 12,
      },
      fontWeight: {
        bold: '700',
        semibold: '600',
      },
    },
    radius: {
      md: 8,
      lg: 12,
    },
    borderWidth: {
      default: 1,
    },
  },
  darkColors: {
    bg: {
      primary: '#000',
    },
    text: {
      primary: '#fff',
      secondary: '#999',
    },
  },
}));

// Mock @sentry/react-native
const mockCaptureException = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: mockCaptureException,
  wrap: jest.fn((component) => component),
}));

import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError: React.FC<{ error: Error }> = ({ error }) => {
  throw error;
};

// Component that renders successfully
const SafeComponent: React.FC = () => {
  return null;
};

describe('ErrorBoundary', () => {
  let originalDev: boolean;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    originalDev = global.__DEV__;
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    global.__DEV__ = originalDev;
    mockConsoleError.mockRestore();
  });

  describe('when no error occurs', () => {
    it('should render children normally', () => {
      const boundary = new ErrorBoundary({ children: <SafeComponent /> });
      expect(boundary.state.hasError).toBe(false);
    });

    it('should not call Sentry.captureException', () => {
      new ErrorBoundary({ children: <SafeComponent /> });
      expect(mockCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('when an error occurs', () => {
    const testError = new Error('Test error');
    const testErrorInfo: React.ErrorInfo = {
      componentStack: '\n    at TestComponent\n    at ErrorBoundary',
    };

    it('should update state to hasError=true', () => {
      const boundary = new ErrorBoundary({ children: <SafeComponent /> });
      const newState = ErrorBoundary.getDerivedStateFromError(testError);

      expect(newState.hasError).toBe(true);
      expect(newState.error).toBe(testError);
    });

    it('should call Sentry.captureException with error and context', () => {
      const boundary = new ErrorBoundary({ children: <SafeComponent /> });
      boundary.componentDidCatch(testError, testErrorInfo);

      expect(mockCaptureException).toHaveBeenCalledTimes(1);
      expect(mockCaptureException).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          contexts: expect.objectContaining({
            react: expect.objectContaining({
              componentStack: testErrorInfo.componentStack,
            }),
          }),
        })
      );
    });

    it('should call onError prop if provided', () => {
      const onError = jest.fn();
      const boundary = new ErrorBoundary({
        children: <SafeComponent />,
        onError,
      });

      boundary.componentDidCatch(testError, testErrorInfo);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(testError, testErrorInfo);
    });

    it('should log to console.error in dev mode', () => {
      global.__DEV__ = true;
      const boundary = new ErrorBoundary({ children: <SafeComponent /> });

      boundary.componentDidCatch(testError, testErrorInfo);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        testError,
        testErrorInfo
      );
    });

    it('should not log to console.error in production mode', () => {
      global.__DEV__ = false;
      const boundary = new ErrorBoundary({ children: <SafeComponent /> });

      boundary.componentDidCatch(testError, testErrorInfo);

      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should call setState with error and errorInfo', () => {
      const boundary = new ErrorBoundary({ children: <SafeComponent /> });
      const setStateSpy = jest.spyOn(boundary, 'setState');

      boundary.componentDidCatch(testError, testErrorInfo);

      expect(setStateSpy).toHaveBeenCalledWith({
        error: testError,
        errorInfo: testErrorInfo,
      });

      setStateSpy.mockRestore();
    });
  });

  describe('Sentry integration', () => {
    const testError = new Error('Sentry integration test');
    const testErrorInfo: React.ErrorInfo = {
      componentStack: '\n    at Component',
    };

    it('should pass component stack to Sentry', () => {
      const boundary = new ErrorBoundary({ children: <SafeComponent /> });
      boundary.componentDidCatch(testError, testErrorInfo);

      const sentryCall = mockCaptureException.mock.calls[0];
      expect(sentryCall[0]).toBe(testError);
      expect(sentryCall[1]).toHaveProperty('contexts.react.componentStack');
      expect(sentryCall[1].contexts.react.componentStack).toBe(testErrorInfo.componentStack);
    });

    it('should call Sentry even when onError prop is provided', () => {
      const onError = jest.fn();
      const boundary = new ErrorBoundary({
        children: <SafeComponent />,
        onError,
      });

      boundary.componentDidCatch(testError, testErrorInfo);

      expect(mockCaptureException).toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    });

    it('should call Sentry before onError callback', () => {
      const callOrder: string[] = [];

      mockCaptureException.mockImplementation(() => {
        callOrder.push('sentry');
      });

      const onError = jest.fn(() => {
        callOrder.push('onError');
      });

      const boundary = new ErrorBoundary({
        children: <SafeComponent />,
        onError,
      });

      boundary.componentDidCatch(testError, testErrorInfo);

      expect(callOrder).toEqual(['sentry', 'onError']);
    });

    it('should handle empty component stack', () => {
      const emptyStackInfo: React.ErrorInfo = { componentStack: '' };
      const boundary = new ErrorBoundary({ children: <SafeComponent /> });

      boundary.componentDidCatch(testError, emptyStackInfo);

      expect(mockCaptureException).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          contexts: expect.objectContaining({
            react: expect.objectContaining({
              componentStack: '',
            }),
          }),
        })
      );
    });

    it('should handle errors with different error types', () => {
      const typeError = new TypeError('Type error test');
      const boundary = new ErrorBoundary({ children: <SafeComponent /> });

      boundary.componentDidCatch(typeError, testErrorInfo);

      expect(mockCaptureException).toHaveBeenCalledWith(
        typeError,
        expect.any(Object)
      );
      expect(mockCaptureException.mock.calls[0][0]).toBeInstanceOf(TypeError);
    });
  });

  describe('error logging service', () => {
    it('should call logErrorToService from componentDidCatch', () => {
      const testError = new Error('Log service test');
      const testErrorInfo: React.ErrorInfo = { componentStack: '\n    at Component' };

      const boundary = new ErrorBoundary({ children: <SafeComponent /> });
      boundary.componentDidCatch(testError, testErrorInfo);

      // Verify Sentry was called (which means logErrorToService was invoked)
      expect(mockCaptureException).toHaveBeenCalledTimes(1);
    });

    it('should pass correct context structure to Sentry', () => {
      const testError = new Error('Context structure test');
      const testErrorInfo: React.ErrorInfo = { componentStack: '\n    at TestComponent' };

      const boundary = new ErrorBoundary({ children: <SafeComponent /> });
      boundary.componentDidCatch(testError, testErrorInfo);

      expect(mockCaptureException).toHaveBeenCalledWith(
        testError,
        {
          contexts: {
            react: {
              componentStack: '\n    at TestComponent',
            },
          },
        }
      );
    });
  });

  describe('getDerivedStateFromError', () => {
    it('should return hasError true and error object', () => {
      const testError = new Error('Derived state test');
      const newState = ErrorBoundary.getDerivedStateFromError(testError);

      expect(newState).toEqual({
        hasError: true,
        error: testError,
      });
    });

    it('should work with different error types', () => {
      const typeError = new TypeError('Type error');
      const newState = ErrorBoundary.getDerivedStateFromError(typeError);

      expect(newState.hasError).toBe(true);
      expect(newState.error).toBe(typeError);
      expect(newState.error).toBeInstanceOf(TypeError);
    });
  });
});

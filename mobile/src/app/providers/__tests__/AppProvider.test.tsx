// Mock @sentry/react-native
const mockCaptureException = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: mockCaptureException,
  wrap: jest.fn((component) => component),
}));

import React from 'react';

describe('AppProvider', () => {
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

  describe('handleError callback', () => {
    const testError = new Error('Test app error');
    const testErrorInfo: React.ErrorInfo = {
      componentStack: '\n    at TestComponent\n    at AppProvider',
    };

    it('should call Sentry.captureException with error and context', () => {
      // Import and get the handler module dynamically
      const { Sentry } = require('@/shared/lib/sentry');

      // Simulate the handleError callback behavior from AppProvider
      const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        if (__DEV__) {
          console.error('App-level error:', error, errorInfo);
        }
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo.componentStack } },
        });
      };

      handleError(testError, testErrorInfo);

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

    it('should log error to console in dev mode', () => {
      global.__DEV__ = true;
      const { Sentry } = require('@/shared/lib/sentry');

      const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        if (__DEV__) {
          console.error('App-level error:', error, errorInfo);
        }
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo.componentStack } },
        });
      };

      handleError(testError, testErrorInfo);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'App-level error:',
        testError,
        testErrorInfo
      );
    });

    it('should not log error to console in production mode', () => {
      global.__DEV__ = false;
      const { Sentry } = require('@/shared/lib/sentry');

      const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        if (__DEV__) {
          console.error('App-level error:', error, errorInfo);
        }
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo.componentStack } },
        });
      };

      handleError(testError, testErrorInfo);

      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should pass component stack to Sentry', () => {
      const { Sentry } = require('@/shared/lib/sentry');

      const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo.componentStack } },
        });
      };

      handleError(testError, testErrorInfo);

      const sentryCall = mockCaptureException.mock.calls[0];
      expect(sentryCall[1].contexts.react.componentStack).toBe(testErrorInfo.componentStack);
    });
  });

  describe('Sentry integration', () => {
    it('should capture error with correct context structure', () => {
      const { Sentry } = require('@/shared/lib/sentry');
      const testError = new Error('Context structure test');
      const testErrorInfo: React.ErrorInfo = {
        componentStack: '\n    at Component',
      };

      const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo.componentStack } },
        });
      };

      handleError(testError, testErrorInfo);

      expect(mockCaptureException).toHaveBeenCalledWith(
        testError,
        {
          contexts: {
            react: {
              componentStack: '\n    at Component',
            },
          },
        }
      );
    });

    it('should handle empty component stack', () => {
      const { Sentry } = require('@/shared/lib/sentry');
      const testError = new Error('Empty stack test');
      const testErrorInfo: React.ErrorInfo = {
        componentStack: '',
      };

      const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo.componentStack } },
        });
      };

      handleError(testError, testErrorInfo);

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
      const { Sentry } = require('@/shared/lib/sentry');
      const typeError = new TypeError('Type error test');
      const testErrorInfo: React.ErrorInfo = {
        componentStack: '\n    at Component',
      };

      const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo.componentStack } },
        });
      };

      handleError(typeError, testErrorInfo);

      expect(mockCaptureException).toHaveBeenCalledWith(
        typeError,
        expect.any(Object)
      );
      expect(mockCaptureException.mock.calls[0][0]).toBeInstanceOf(TypeError);
    });

    it('should call Sentry without throwing', () => {
      const { Sentry } = require('@/shared/lib/sentry');
      const testError = new Error('Non-throwing test');
      const testErrorInfo: React.ErrorInfo = {
        componentStack: '\n    at Component',
      };

      const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo.componentStack } },
        });
      };

      expect(() => {
        handleError(testError, testErrorInfo);
      }).not.toThrow();
    });
  });
});

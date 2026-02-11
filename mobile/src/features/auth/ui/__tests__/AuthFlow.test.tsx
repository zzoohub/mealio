jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Alert: { alert: jest.fn() },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => {
      if (!style) return {};
      if (!Array.isArray(style)) return style;
      return style.reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
    },
  },
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

const mockLogin = jest.fn();
const mockLogout = jest.fn();
jest.mock('../../model/authStore', () => ({
  useAuthStore: () => ({
    login: mockLogin,
    isLoading: false,
  }),
}));

const mockGoogleSignIn = jest.fn();
jest.mock('../../model/useGoogleAuth', () => ({
  useGoogleAuth: () => ({
    signIn: mockGoogleSignIn,
    isSigningIn: false,
  }),
}));

const mockAppleSignIn = jest.fn();
jest.mock('../../model/useAppleAuth', () => ({
  useAppleAuth: () => ({
    signIn: mockAppleSignIn,
    isSigningIn: false,
  }),
}));

jest.mock('@/entities/entry', () => ({
  useMigration: () => ({
    checkLocalEntries: jest.fn().mockResolvedValue(0),
    migrateLocalEntries: jest.fn(),
  }),
}));

jest.mock('@/shared/lib/i18n', () => ({
  useAuthI18n: () => ({
    welcomeTitle: 'Welcome',
    welcomeSubtitle: 'Sign in to continue',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    termsFooter: 'Terms apply',
    syncLocalEntries: 'Sync',
    syncLocalEntriesMessage: (n: number) => `Sync ${n} entries?`,
    skip: 'Skip',
    sync: 'Sync',
    migrationError: 'Error',
    migrationErrorMessage: 'Migration failed',
    signInFailed: (p: string) => `${p} sign in failed`,
  }),
  useCommonI18n: () => ({
    error: 'Error',
  }),
}));
jest.mock('@/shared/ui/theme', () => ({
  createStyles: (fn: Function) =>
    fn(
      {
        bg: { primary: '#fff' },
        text: { primary: '#000', secondary: '#666', tertiary: '#999' },
        interactive: { primary: '#ff6600' },
      },
      {}
    ),
  useStyles: (styles: Record<string, unknown>) => styles,
  useTheme: () => ({ colors: { text: { primary: '#000' } } }),
}));
jest.mock('@/shared/ui/styled', () => ({
  Text: 'Text',
}));
jest.mock('@/shared/ui/tokens', () => ({
  tokens: {
    spacing: {
      layout: { sm: 16, md: 24, xl: 40 },
      component: { sm: 8, md: 12 },
    },
    typography: {
      fontSize: { h2: 24, body: 16, caption: 12 },
      fontWeight: { bold: '700' },
    },
    size: {
      touchTarget: { md: 44 },
      icon: { md: 24 },
    },
  },
}));
jest.mock('../GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onPress, label }: { onPress: () => void; label: string }) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onPress} testID="google-btn">
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));
jest.mock('../AppleSignInButton', () => ({
  AppleSignInButton: ({ onPress, label }: { onPress: () => void; label: string }) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onPress} testID="apple-btn">
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AuthFlow } from '../AuthFlow';

describe('AuthFlow', () => {
  const onComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome text and sign-in buttons', () => {
    const { getByText } = render(<AuthFlow onComplete={onComplete} />);

    expect(getByText('Welcome')).toBeTruthy();
    expect(getByText('Sign in to continue')).toBeTruthy();
    expect(getByText('Continue with Google')).toBeTruthy();
    expect(getByText('Continue with Apple')).toBeTruthy();
    expect(getByText('Terms apply')).toBeTruthy();
  });

  it('calls router.back when back button pressed', () => {
    const { UNSAFE_queryAllByType } = render(<AuthFlow onComplete={onComplete} />);
    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    // First pressable is the back button
    fireEvent.press(pressables[0]);
    expect(router.back).toHaveBeenCalled();
  });

  it('calls googleSignIn when Google button pressed', () => {
    mockGoogleSignIn.mockResolvedValueOnce(null);
    const { getByTestId } = render(<AuthFlow onComplete={onComplete} />);

    fireEvent.press(getByTestId('google-btn'));
    expect(mockGoogleSignIn).toHaveBeenCalled();
  });

  it('calls appleSignIn when Apple button pressed', () => {
    mockAppleSignIn.mockResolvedValueOnce(null);
    const { getByTestId } = render(<AuthFlow onComplete={onComplete} />);

    fireEvent.press(getByTestId('apple-btn'));
    expect(mockAppleSignIn).toHaveBeenCalled();
  });
});

// mockPlatform is mutated per describe block to simulate different platforms.
// Platform.OS is read at runtime (useEffect guard and render guard), so a
// single top-level mock with a mutable value works correctly.
const mockPlatform = { OS: 'ios' as string };

const mockIsAvailableAsync = jest.fn();

jest.mock('react-native', () => ({
  get Platform() {
    return mockPlatform;
  },
  View: 'View',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    create: (s: any) => s,
    flatten: (s: any) => {
      if (!s) return {};
      if (!Array.isArray(s)) return s;
      return s.reduce((acc: any, item: any) => ({ ...acc, ...item }), {});
    },
  },
}));
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: mockIsAvailableAsync,
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('@/shared/ui/theme', () => ({
  createStyles: (fn: Function) =>
    fn(
      {
        bg: { primary: '#fff' },
        text: { primary: '#000', secondary: '#666' },
        border: { default: '#e0e0e0' },
        interactive: { primary: '#ff6600' },
      },
      {},
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
      component: { md: 12 },
    },
    typography: {
      fontSize: { body: 16 },
      fontWeight: { medium: '500' },
    },
    radius: { lg: 16 },
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AppleSignInButton } from '../AppleSignInButton';

// ---------------------------------------------------------------------------
// iOS — Apple Sign In available
// ---------------------------------------------------------------------------
describe('AppleSignInButton (iOS, Apple Sign In available)', () => {
  beforeEach(() => {
    mockPlatform.OS = 'ios';
    mockIsAvailableAsync.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the button with label text after availability check resolves', async () => {
    const { getByText } = render(
      <AppleSignInButton onPress={jest.fn()} label="Continue with Apple" />,
    );

    await waitFor(() => {
      expect(getByText('Continue with Apple')).toBeTruthy();
    });
  });

  it('renders Apple Ionicons icon when not loading', async () => {
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={jest.fn()} label="Continue with Apple" />,
    );

    await waitFor(() => {
      const ionicons = UNSAFE_queryAllByType('Ionicons' as any);
      expect(ionicons.length).toBeGreaterThan(0);
    });

    const spinners = UNSAFE_queryAllByType('ActivityIndicator' as any);
    expect(spinners).toHaveLength(0);
  });

  it('renders ActivityIndicator instead of icon when isLoading is true', async () => {
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={jest.fn()} label="Continue with Apple" isLoading />,
    );

    await waitFor(() => {
      const spinners = UNSAFE_queryAllByType('ActivityIndicator' as any);
      expect(spinners.length).toBeGreaterThan(0);
    });

    const ionicons = UNSAFE_queryAllByType('Ionicons' as any);
    expect(ionicons).toHaveLength(0);
  });

  it('calls onPress when button is pressed', async () => {
    const onPress = jest.fn();
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={onPress} label="Continue with Apple" />,
    );

    await waitFor(() => {
      const pressables = UNSAFE_queryAllByType('Pressable' as any);
      expect(pressables.length).toBeGreaterThan(0);
    });

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    fireEvent.press(pressables[0]);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disables the Pressable when isLoading is true', async () => {
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={jest.fn()} label="Continue with Apple" isLoading />,
    );

    await waitFor(() => {
      const pressables = UNSAFE_queryAllByType('Pressable' as any);
      expect(pressables.length).toBeGreaterThan(0);
    });

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables[0].props.disabled).toBe(true);
  });

  it('disables the Pressable when disabled prop is true', async () => {
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={jest.fn()} label="Continue with Apple" disabled />,
    );

    await waitFor(() => {
      const pressables = UNSAFE_queryAllByType('Pressable' as any);
      expect(pressables.length).toBeGreaterThan(0);
    });

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables[0].props.disabled).toBe(true);
  });

  it('Pressable is not disabled by default', async () => {
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={jest.fn()} label="Continue with Apple" />,
    );

    await waitFor(() => {
      const pressables = UNSAFE_queryAllByType('Pressable' as any);
      expect(pressables.length).toBeGreaterThan(0);
    });

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables[0].props.disabled).toBe(false);
  });

  it('has correct accessibilityRole and accessibilityLabel', async () => {
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={jest.fn()} label="Sign in with Apple" />,
    );

    await waitFor(() => {
      const pressables = UNSAFE_queryAllByType('Pressable' as any);
      expect(pressables.length).toBeGreaterThan(0);
    });

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables[0].props.accessibilityRole).toBe('button');
    expect(pressables[0].props.accessibilityLabel).toBe('Sign in with Apple');
  });

  it('has hitSlop configured on the Pressable', async () => {
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={jest.fn()} label="Continue with Apple" />,
    );

    await waitFor(() => {
      const pressables = UNSAFE_queryAllByType('Pressable' as any);
      expect(pressables.length).toBeGreaterThan(0);
    });

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables[0].props.hitSlop).toEqual({
      top: 8,
      bottom: 8,
      left: 8,
      right: 8,
    });
  });

  it('calls isAvailableAsync to check Apple Sign In availability', async () => {
    render(<AppleSignInButton onPress={jest.fn()} label="Continue with Apple" />);

    await waitFor(() => {
      expect(mockIsAvailableAsync).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// iOS — Apple Sign In NOT available
// ---------------------------------------------------------------------------
describe('AppleSignInButton (iOS, Apple Sign In not available)', () => {
  beforeEach(() => {
    mockPlatform.OS = 'ios';
    mockIsAvailableAsync.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing before availability resolves (initial state is false)', () => {
    // isAvailable starts false synchronously, so the component returns null before
    // the async check resolves.
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={jest.fn()} label="Continue with Apple" />,
    );

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables).toHaveLength(0);
  });

  it('still renders nothing after availability resolves to false', async () => {
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={jest.fn()} label="Continue with Apple" />,
    );

    await waitFor(() => {
      expect(mockIsAvailableAsync).toHaveBeenCalled();
    });

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Android — component always returns null, never calls isAvailableAsync
// ---------------------------------------------------------------------------
describe('AppleSignInButton (Android)', () => {
  beforeEach(() => {
    mockPlatform.OS = 'android';
    mockIsAvailableAsync.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing on Android', () => {
    const { UNSAFE_queryAllByType } = render(
      <AppleSignInButton onPress={jest.fn()} label="Continue with Apple" />,
    );

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables).toHaveLength(0);
  });

  it('does not call isAvailableAsync on Android', async () => {
    render(<AppleSignInButton onPress={jest.fn()} label="Continue with Apple" />);

    // Give effects time to run — isAvailableAsync should NOT be called
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockIsAvailableAsync).not.toHaveBeenCalled();
  });
});

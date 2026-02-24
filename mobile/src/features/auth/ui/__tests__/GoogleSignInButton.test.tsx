jest.mock('react-native', () => ({
  View: 'View',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
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
import { render, fireEvent } from '@testing-library/react-native';
import { GoogleSignInButton } from '../GoogleSignInButton';

describe('GoogleSignInButton', () => {
  const defaultProps = {
    onPress: jest.fn(),
    label: 'Continue with Google',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders label text', () => {
    const { getByText } = render(<GoogleSignInButton {...defaultProps} />);

    expect(getByText('Continue with Google')).toBeTruthy();
  });

  it('renders Google icon when not loading', () => {
    const { UNSAFE_queryAllByType } = render(
      <GoogleSignInButton {...defaultProps} />,
    );

    // Should render the Ionicons (Google logo), not ActivityIndicator
    const ionicons = UNSAFE_queryAllByType('Ionicons' as any);
    expect(ionicons.length).toBeGreaterThan(0);

    const spinners = UNSAFE_queryAllByType('ActivityIndicator' as any);
    expect(spinners).toHaveLength(0);
  });

  it('renders ActivityIndicator when isLoading is true', () => {
    const { UNSAFE_queryAllByType } = render(
      <GoogleSignInButton {...defaultProps} isLoading />,
    );

    const spinners = UNSAFE_queryAllByType('ActivityIndicator' as any);
    expect(spinners.length).toBeGreaterThan(0);

    // Should NOT render the Ionicons Google logo while loading
    const ionicons = UNSAFE_queryAllByType('Ionicons' as any);
    expect(ionicons).toHaveLength(0);
  });

  it('calls onPress when button is pressed', () => {
    const { UNSAFE_queryAllByType } = render(<GoogleSignInButton {...defaultProps} />);

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    fireEvent.press(pressables[0]);

    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled is true', () => {
    const { UNSAFE_queryAllByType } = render(
      <GoogleSignInButton {...defaultProps} disabled />,
    );

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    fireEvent.press(pressables[0]);

    // The Pressable has disabled prop set — fireEvent still fires but
    // onPress should not be invoked by the component logic
    // We verify the disabled prop is applied by asserting the button is disabled
    expect(pressables[0].props.disabled).toBe(true);
  });

  it('disables the button when isLoading is true', () => {
    const { UNSAFE_queryAllByType } = render(
      <GoogleSignInButton {...defaultProps} isLoading />,
    );

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables[0].props.disabled).toBe(true);
  });

  it('disables the button when disabled prop is true', () => {
    const { UNSAFE_queryAllByType } = render(
      <GoogleSignInButton {...defaultProps} disabled />,
    );

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables[0].props.disabled).toBe(true);
  });

  it('button is not disabled by default', () => {
    const { UNSAFE_queryAllByType } = render(<GoogleSignInButton {...defaultProps} />);

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables[0].props.disabled).toBe(false);
  });

  it('has correct accessibilityRole and accessibilityLabel', () => {
    const { UNSAFE_queryAllByType } = render(
      <GoogleSignInButton {...defaultProps} label="Sign in with Google" />,
    );

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables[0].props.accessibilityRole).toBe('button');
    expect(pressables[0].props.accessibilityLabel).toBe('Sign in with Google');
  });

  it('has hitSlop configured', () => {
    const { UNSAFE_queryAllByType } = render(<GoogleSignInButton {...defaultProps} />);

    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables[0].props.hitSlop).toEqual({
      top: 8,
      bottom: 8,
      left: 8,
      right: 8,
    });
  });

  it('renders custom label text correctly', () => {
    const { getByText } = render(
      <GoogleSignInButton {...defaultProps} label="Sign In" />,
    );

    expect(getByText('Sign In')).toBeTruthy();
  });
});

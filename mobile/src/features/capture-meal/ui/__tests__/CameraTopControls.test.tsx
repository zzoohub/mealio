jest.mock('react-native', () => ({
  View: 'View',
  Pressable: 'Pressable',
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
jest.mock('@/shared/ui/tokens', () => ({
  iconSizes: { md: 24 },
  tokens: {
    spacing: { component: { sm: 8, lg: 16 } },
    size: { touchTarget: { md: 44 } },
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CameraTopControls } from '../CameraTopControls';

describe('CameraTopControls', () => {
  const defaultProps = {
    flashIcon: 'flash-outline' as const,
    onToggleFlash: jest.fn(),
    onSettingsPress: jest.fn(),
    topInset: 47,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders two control buttons', () => {
    const { UNSAFE_queryAllByType } = render(<CameraTopControls {...defaultProps} />);
    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    expect(pressables).toHaveLength(2);
  });

  it('calls onSettingsPress when settings button pressed', () => {
    const { UNSAFE_queryAllByType } = render(<CameraTopControls {...defaultProps} />);
    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    fireEvent.press(pressables[0]);
    expect(defaultProps.onSettingsPress).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleFlash when flash button pressed', () => {
    const { UNSAFE_queryAllByType } = render(<CameraTopControls {...defaultProps} />);
    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    fireEvent.press(pressables[1]);
    expect(defaultProps.onToggleFlash).toHaveBeenCalledTimes(1);
  });
});

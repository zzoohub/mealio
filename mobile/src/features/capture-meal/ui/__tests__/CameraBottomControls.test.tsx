jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
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
    spacing: { component: { xs: 4, sm: 8, lg: 16 } },
    typography: { fontSize: { caption: 12 }, fontWeight: { medium: '500' } },
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CameraBottomControls } from '../CameraBottomControls';

describe('CameraBottomControls', () => {
  const defaultProps = {
    onDiaryPress: jest.fn(),
    onGalleryPress: jest.fn(),
    diaryLabel: 'Diary',
    bottomInset: 34,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders diary label text', () => {
    const { getByText } = render(<CameraBottomControls {...defaultProps} />);
    expect(getByText('Diary')).toBeTruthy();
  });

  it('calls onDiaryPress when diary button pressed', () => {
    const { getByText } = render(<CameraBottomControls {...defaultProps} />);
    fireEvent.press(getByText('Diary'));
    expect(defaultProps.onDiaryPress).toHaveBeenCalledTimes(1);
  });

  it('calls onGalleryPress when gallery button pressed', () => {
    const { UNSAFE_queryAllByType } = render(<CameraBottomControls {...defaultProps} />);
    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    // Gallery button is the second pressable
    fireEvent.press(pressables[1]);
    expect(defaultProps.onGalleryPress).toHaveBeenCalledTimes(1);
  });
});

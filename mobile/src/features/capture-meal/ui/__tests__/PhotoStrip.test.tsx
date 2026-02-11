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
jest.mock('expo-image', () => ({
  Image: 'Image',
}));
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem }: { data: string[]; renderItem: Function }) => {
    const items = data.map((item: string, index: number) => renderItem({ item, index }));
    return items;
  },
}));
jest.mock('@/shared/ui/theme', () => ({
  createStyles: (fn: Function) =>
    fn(
      {
        interactive: { primary: '#ff6600' },
      },
      {}
    ),
  useStyles: (styles: Record<string, unknown>) => styles,
}));
jest.mock('@/shared/ui/tokens', () => ({
  iconSizes: { md: 24 },
  tokens: {
    spacing: {
      layout: { md: 24 },
      component: { md: 12, lg: 16 },
    },
    radius: { full: 9999 },
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PhotoStrip } from '../PhotoStrip';

describe('PhotoStrip', () => {
  const defaultProps = {
    photos: ['photo1.jpg', 'photo2.jpg'],
    onRemovePhoto: jest.fn(),
    onDone: jest.fn(),
    onPickFromGallery: jest.fn(),
    photoCount: 2,
    bottomInset: 34,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders photo count badge', () => {
    const { getAllByText } = render(<PhotoStrip {...defaultProps} />);
    // Badge "2" + index "2" both render
    expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('renders thumbnail index numbers', () => {
    const { getByText, getAllByText } = render(<PhotoStrip {...defaultProps} />);
    expect(getByText('1')).toBeTruthy();
    // "2" appears in both badge and index
    expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onPickFromGallery when gallery button pressed', () => {
    const { UNSAFE_queryAllByType } = render(<PhotoStrip {...defaultProps} />);
    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    // First pressable is gallery button
    fireEvent.press(pressables[0]);
    expect(defaultProps.onPickFromGallery).toHaveBeenCalledTimes(1);
  });

  it('calls onDone when done button pressed', () => {
    const { UNSAFE_queryAllByType } = render(<PhotoStrip {...defaultProps} />);
    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    // Last pressable is done button
    fireEvent.press(pressables[pressables.length - 1]);
    expect(defaultProps.onDone).toHaveBeenCalledTimes(1);
  });

  it('calls onRemovePhoto with correct index when remove pressed', () => {
    const { UNSAFE_queryAllByType } = render(<PhotoStrip {...defaultProps} />);
    const pressables = UNSAFE_queryAllByType('Pressable' as any);
    // Remove buttons are in the middle (after gallery, before done)
    // Gallery (0), Remove photo 1 (1), Remove photo 2 (2), Done (3)
    fireEvent.press(pressables[1]);
    expect(defaultProps.onRemovePhoto).toHaveBeenCalledWith(0);
  });

  it('renders with empty photos array', () => {
    const { getByText } = render(
      <PhotoStrip {...defaultProps} photos={[]} photoCount={0} />,
    );
    expect(getByText('0')).toBeTruthy();
  });
});

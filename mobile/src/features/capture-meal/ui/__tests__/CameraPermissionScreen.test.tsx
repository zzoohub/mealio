const mockOpenSettings = jest.fn(() => Promise.resolve());

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Linking: {
    openSettings: () => mockOpenSettings(),
  },
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
  createStyles: (fn: Function) => fn(
    {
      bg: { primary: '#fff' },
      text: { primary: '#000', secondary: '#666' },
      interactive: { primary: '#ff6600' },
    },
    {}
  ),
  useStyles: (styles: Record<string, unknown>) => styles,
}));
jest.mock('@/shared/ui/tokens', () => ({
  tokens: {
    spacing: {
      layout: { sm: 16, md: 24, lg: 32 },
      component: { lg: 16 },
    },
    typography: {
      fontSize: { h3: 20, body: 16 },
      fontWeight: { bold: '700', semibold: '600' },
      lineHeight: { body: 24 },
    },
    radius: { md: 12 },
    size: { touchTarget: { lg: 48 } },
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CameraPermissionScreen } from '../CameraPermissionScreen';

describe('CameraPermissionScreen', () => {
  const defaultProps = {
    onRequestPermission: jest.fn(),
    labels: {
      title: 'Camera Access',
      message: 'We need camera access to take meal photos',
      buttonText: 'Continue',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, message, and button text', () => {
    const { getByText } = render(<CameraPermissionScreen {...defaultProps} />);

    expect(getByText('Camera Access')).toBeTruthy();
    expect(getByText('We need camera access to take meal photos')).toBeTruthy();
    expect(getByText('Continue')).toBeTruthy();
  });

  it('calls onRequestPermission when button pressed', () => {
    const { getByText } = render(<CameraPermissionScreen {...defaultProps} />);

    fireEvent.press(getByText('Continue'));
    expect(defaultProps.onRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('renders with custom labels', () => {
    const customLabels = {
      title: 'Custom Title',
      message: 'Custom message',
      buttonText: 'Custom Button',
    };
    const { getByText } = render(
      <CameraPermissionScreen onRequestPermission={jest.fn()} labels={customLabels} />,
    );

    expect(getByText('Custom Title')).toBeTruthy();
    expect(getByText('Custom message')).toBeTruthy();
    expect(getByText('Custom Button')).toBeTruthy();
  });

  describe('when permission is denied', () => {
    const deniedProps = {
      ...defaultProps,
      isDenied: true,
      onGoBack: jest.fn(),
      labels: {
        ...defaultProps.labels,
        openSettingsText: 'Enable in Settings',
        goBackText: 'Go Back',
      },
    };

    it('shows Go Back as the primary button', () => {
      const { getByText, queryByText } = render(
        <CameraPermissionScreen {...deniedProps} />,
      );

      expect(getByText('Go Back')).toBeTruthy();
      expect(queryByText('Continue')).toBeNull();
    });

    it('calls onGoBack when Go Back button is pressed', () => {
      const { getByText } = render(
        <CameraPermissionScreen {...deniedProps} />,
      );

      fireEvent.press(getByText('Go Back'));
      expect(deniedProps.onGoBack).toHaveBeenCalledTimes(1);
      expect(mockOpenSettings).not.toHaveBeenCalled();
    });

    it('shows a secondary settings link', () => {
      const { getByText } = render(
        <CameraPermissionScreen {...deniedProps} />,
      );

      expect(getByText('Enable in Settings')).toBeTruthy();
    });

    it('calls Linking.openSettings when settings link is pressed', () => {
      const { getByText } = render(
        <CameraPermissionScreen {...deniedProps} />,
      );

      fireEvent.press(getByText('Enable in Settings'));
      expect(mockOpenSettings).toHaveBeenCalledTimes(1);
      expect(deniedProps.onGoBack).not.toHaveBeenCalled();
    });

    it('does not call onRequestPermission in denied state', () => {
      const { getByText } = render(
        <CameraPermissionScreen {...deniedProps} />,
      );

      fireEvent.press(getByText('Go Back'));
      fireEvent.press(getByText('Enable in Settings'));
      expect(defaultProps.onRequestPermission).not.toHaveBeenCalled();
    });
  });

  it('calls onRequestPermission when not denied', () => {
    const { getByText } = render(
      <CameraPermissionScreen
        {...defaultProps}
        isDenied={false}
        labels={{ ...defaultProps.labels, openSettingsText: 'Enable in Settings' }}
      />,
    );

    fireEvent.press(getByText('Continue'));
    expect(defaultProps.onRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockOpenSettings).not.toHaveBeenCalled();
  });
});

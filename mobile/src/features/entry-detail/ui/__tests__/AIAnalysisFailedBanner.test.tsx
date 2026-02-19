// Mock native modules before any imports
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

const mockColors = {
  bg: { secondary: '#f5f5f5' },
  border: { default: '#e0e0e0' },
  text: { secondary: '#666666' },
  interactive: { primary: '#007aff' },
  status: { error: '#ff3b30' },
};

const useStylesImpl = (stylesFn: any) => stylesFn(mockColors);

jest.mock('@/shared/ui/theme', () => ({
  useStyles: jest.fn(useStylesImpl),
  createStyles: jest.fn((fn: any) => fn),
}));

jest.mock('@/shared/ui/tokens', () => ({
  tokens: {
    spacing: {
      component: { sm: 8, md: 12, lg: 16 },
    },
    typography: {
      fontSize: { bodySmall: 13 },
      fontWeight: { normal: '400', semibold: '600' },
      lineHeight: { body: 1.5 },
    },
    borderWidth: { default: 1 },
    size: {
      icon: { xs: 16 },
    },
  },
}));

jest.mock('@/shared/lib/i18n', () => ({
  useDiaryI18n: jest.fn(),
  useCommonI18n: jest.fn(),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AIAnalysisFailedBanner } from '../AIAnalysisFailedBanner';
import { useDiaryI18n, useCommonI18n } from '@/shared/lib/i18n';
import { useStyles } from '@/shared/ui/theme';

const mockUseDiaryI18n = useDiaryI18n as jest.MockedFunction<typeof useDiaryI18n>;
const mockUseCommonI18n = useCommonI18n as jest.MockedFunction<typeof useCommonI18n>;
const mockUseStyles = useStyles as jest.MockedFunction<typeof useStyles>;

describe('AIAnalysisFailedBanner', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup mocks after clearAllMocks (resetMocks: true clears implementations)
    mockUseStyles.mockImplementation(useStylesImpl);
    (mockUseDiaryI18n as jest.Mock).mockReturnValue({
      aiAnalysisFailed: 'Analysis failed',
    });
    (mockUseCommonI18n as jest.Mock).mockReturnValue({
      retry: 'Retry',
    });
    mockOnRetry.mockReset();
  });

  // =============================================================================
  // Rendering
  // =============================================================================

  it('renders without crashing', () => {
    expect(() =>
      render(<AIAnalysisFailedBanner onRetry={mockOnRetry} />)
    ).not.toThrow();
  });

  it('renders the failure text from i18n', () => {
    const { getByText } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} />
    );
    expect(getByText('Analysis failed')).toBeTruthy();
  });

  it('renders the retry button text from i18n', () => {
    const { getByText } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} />
    );
    expect(getByText('Retry')).toBeTruthy();
  });

  it('renders an icon', () => {
    const { UNSAFE_getAllByType } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} />
    );
    const icons = UNSAFE_getAllByType('Ionicons' as any);
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders the alert-circle-outline icon', () => {
    const { UNSAFE_getAllByType } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} />
    );
    const icons = UNSAFE_getAllByType('Ionicons' as any);
    expect(icons[0].props.name).toBe('alert-circle-outline');
  });

  it('renders a container View', () => {
    const { UNSAFE_getAllByType } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} />
    );
    const views = UNSAFE_getAllByType('View' as any);
    expect(views.length).toBeGreaterThan(0);
  });

  // =============================================================================
  // testID prop
  // =============================================================================

  it('applies testID to the container when provided', () => {
    const { getByTestId } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} testID="ai-failed-banner" />
    );
    expect(getByTestId('ai-failed-banner')).toBeTruthy();
  });

  it('renders without testID when not provided', () => {
    const { queryByTestId } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} />
    );
    expect(queryByTestId('ai-failed-banner')).toBeNull();
  });

  // =============================================================================
  // Retry interaction
  // =============================================================================

  it('calls onRetry when retry button is pressed', () => {
    const { getByText } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} />
    );

    fireEvent.press(getByText('Retry'));

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry only once per press', () => {
    const { getByText } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} />
    );

    fireEvent.press(getByText('Retry'));
    fireEvent.press(getByText('Retry'));

    expect(mockOnRetry).toHaveBeenCalledTimes(2);
  });

  // =============================================================================
  // i18n integration
  // =============================================================================

  it('calls useDiaryI18n hook', () => {
    render(<AIAnalysisFailedBanner onRetry={mockOnRetry} />);
    expect(mockUseDiaryI18n).toHaveBeenCalled();
  });

  it('calls useCommonI18n hook', () => {
    render(<AIAnalysisFailedBanner onRetry={mockOnRetry} />);
    expect(mockUseCommonI18n).toHaveBeenCalled();
  });

  it('displays failure text in Korean when i18n returns Korean text', () => {
    (mockUseDiaryI18n as jest.Mock).mockReturnValue({
      aiAnalysisFailed: 'AI 분석에 실패했습니다',
    });
    (mockUseCommonI18n as jest.Mock).mockReturnValue({
      retry: '다시 시도',
    });

    const { getByText } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} />
    );

    expect(getByText('AI 분석에 실패했습니다')).toBeTruthy();
    expect(getByText('다시 시도')).toBeTruthy();
  });

  // =============================================================================
  // Styles via useStyles
  // =============================================================================

  it('calls useStyles with a style function', () => {
    render(<AIAnalysisFailedBanner onRetry={mockOnRetry} />);
    expect(mockUseStyles).toHaveBeenCalled();
  });

  it('applies icon color from theme status.error', () => {
    const { UNSAFE_getAllByType } = render(
      <AIAnalysisFailedBanner onRetry={mockOnRetry} />
    );
    const icons = UNSAFE_getAllByType('Ionicons' as any);
    // Icon color comes from styles.icon.color which is mockColors.status.error
    expect(icons[0].props.color).toBe(mockColors.status.error);
  });
});

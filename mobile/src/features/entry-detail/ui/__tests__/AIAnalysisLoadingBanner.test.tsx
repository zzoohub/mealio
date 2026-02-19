// Mock native modules before any imports
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
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

const mockColors = {
  bg: { secondary: '#f5f5f5' },
  border: { default: '#e0e0e0' },
  text: { secondary: '#666666' },
  interactive: { primary: '#007aff' },
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
      fontWeight: { normal: '400' },
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
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { AIAnalysisLoadingBanner } from '../AIAnalysisLoadingBanner';
import { useDiaryI18n } from '@/shared/lib/i18n';
import { useStyles } from '@/shared/ui/theme';

const mockUseDiaryI18n = useDiaryI18n as jest.MockedFunction<typeof useDiaryI18n>;
const mockUseStyles = useStyles as jest.MockedFunction<typeof useStyles>;

describe('AIAnalysisLoadingBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup mocks after clearAllMocks (resetMocks: true clears implementations)
    mockUseStyles.mockImplementation(useStylesImpl);
    (mockUseDiaryI18n as jest.Mock).mockReturnValue({
      aiAnalyzing: 'Analyzing your meal...',
    });
  });

  // =============================================================================
  // Rendering
  // =============================================================================

  it('renders without crashing', () => {
    expect(() => render(<AIAnalysisLoadingBanner />)).not.toThrow();
  });

  it('renders the analyzing text from i18n', () => {
    const { getByText } = render(<AIAnalysisLoadingBanner />);
    expect(getByText('Analyzing your meal...')).toBeTruthy();
  });

  it('renders an ActivityIndicator', () => {
    const { UNSAFE_getAllByType } = render(<AIAnalysisLoadingBanner />);
    const indicators = UNSAFE_getAllByType('ActivityIndicator' as any);
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('renders a container View', () => {
    const { UNSAFE_getAllByType } = render(<AIAnalysisLoadingBanner />);
    const views = UNSAFE_getAllByType('View' as any);
    expect(views.length).toBeGreaterThan(0);
  });

  // =============================================================================
  // testID prop
  // =============================================================================

  it('applies testID to the container when provided', () => {
    const { getByTestId } = render(
      <AIAnalysisLoadingBanner testID="ai-loading-banner" />
    );
    expect(getByTestId('ai-loading-banner')).toBeTruthy();
  });

  it('renders without testID when not provided', () => {
    const { queryByTestId } = render(<AIAnalysisLoadingBanner />);
    expect(queryByTestId('ai-loading-banner')).toBeNull();
  });

  // =============================================================================
  // i18n integration
  // =============================================================================

  it('calls useDiaryI18n hook', () => {
    render(<AIAnalysisLoadingBanner />);
    expect(mockUseDiaryI18n).toHaveBeenCalled();
  });

  it('displays different text when i18n returns different value', () => {
    (mockUseDiaryI18n as jest.Mock).mockReturnValue({
      aiAnalyzing: '분석 중...',
    });

    const { getByText } = render(<AIAnalysisLoadingBanner />);
    expect(getByText('분석 중...')).toBeTruthy();
  });

  // =============================================================================
  // Styles via useStyles
  // =============================================================================

  it('calls useStyles with a style function', () => {
    render(<AIAnalysisLoadingBanner />);
    expect(mockUseStyles).toHaveBeenCalled();
  });

  it('applies spinner color from theme', () => {
    const { UNSAFE_getAllByType } = render(<AIAnalysisLoadingBanner />);
    const indicators = UNSAFE_getAllByType('ActivityIndicator' as any);
    // Spinner color comes from styles.spinner.color which is mockColors.interactive.primary
    expect(indicators[0].props.color).toBe(mockColors.interactive.primary);
  });

  it('ActivityIndicator has small size', () => {
    const { UNSAFE_getAllByType } = render(<AIAnalysisLoadingBanner />);
    const indicators = UNSAFE_getAllByType('ActivityIndicator' as any);
    expect(indicators[0].props.size).toBe('small');
  });
});

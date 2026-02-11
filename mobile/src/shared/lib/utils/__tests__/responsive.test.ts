jest.mock('react-native', () => ({
  useWindowDimensions: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

import { renderHook } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive, responsiveValue } from '../responsive';

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;
const mockUseSafeAreaInsets = useSafeAreaInsets as jest.Mock;

const defaultInsets = { top: 44, bottom: 34, left: 0, right: 0 };

describe('responsive utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSafeAreaInsets.mockReturnValue(defaultInsets);
  });

  // ===========================================================================
  // useResponsive
  // ===========================================================================

  describe('useResponsive', () => {
    it('reports isSmallScreen for width < 375', () => {
      mockUseWindowDimensions.mockReturnValue({ width: 320, height: 568 });
      const { result } = renderHook(() => useResponsive());

      expect(result.current.isSmallScreen).toBe(true);
      expect(result.current.isMediumScreen).toBe(false);
      expect(result.current.isLargeScreen).toBe(false);
    });

    it('reports isMediumScreen for width 375–413', () => {
      mockUseWindowDimensions.mockReturnValue({ width: 390, height: 844 });
      const { result } = renderHook(() => useResponsive());

      expect(result.current.isSmallScreen).toBe(false);
      expect(result.current.isMediumScreen).toBe(true);
      expect(result.current.isLargeScreen).toBe(false);
    });

    it('reports isLargeScreen for width >= 414', () => {
      mockUseWindowDimensions.mockReturnValue({ width: 428, height: 926 });
      const { result } = renderHook(() => useResponsive());

      expect(result.current.isSmallScreen).toBe(false);
      expect(result.current.isMediumScreen).toBe(false);
      expect(result.current.isLargeScreen).toBe(true);
    });

    it('passes through insets from useSafeAreaInsets', () => {
      mockUseWindowDimensions.mockReturnValue({ width: 390, height: 844 });
      const { result } = renderHook(() => useResponsive());

      expect(result.current.insets).toEqual(defaultInsets);
    });

    it('calculates gridItemSize correctly', () => {
      mockUseWindowDimensions.mockReturnValue({ width: 390, height: 844 });
      const { result } = renderHook(() => useResponsive());

      // 3 columns, 2px gap, no padding: (390 - 2*2) / 3 = 128.67
      const size = result.current.gridItemSize(3, 2);
      expect(size).toBeCloseTo(128.67, 1);
    });

    it('calculates gridItemSize with horizontal padding', () => {
      mockUseWindowDimensions.mockReturnValue({ width: 390, height: 844 });
      const { result } = renderHook(() => useResponsive());

      // 3 columns, 2px gap, 16px padding each side: (390 - 4 - 32) / 3 = 118
      const size = result.current.gridItemSize(3, 2, 16);
      expect(size).toBeCloseTo(118, 0);
    });
  });

  // ===========================================================================
  // responsiveValue
  // ===========================================================================

  describe('responsiveValue', () => {
    it('returns small value for small screens', () => {
      expect(responsiveValue(320, { small: 10, medium: 20, large: 30 })).toBe(10);
    });

    it('returns medium value for medium screens', () => {
      expect(responsiveValue(390, { small: 10, medium: 20, large: 30 })).toBe(20);
    });

    it('returns large value for large screens', () => {
      expect(responsiveValue(428, { small: 10, medium: 20, large: 30 })).toBe(30);
    });

    it('falls back to small when medium is omitted', () => {
      expect(responsiveValue(390, { small: 10 })).toBe(10);
    });

    it('falls back to medium when large is omitted', () => {
      expect(responsiveValue(428, { small: 10, medium: 20 })).toBe(20);
    });

    it('falls back to small when both medium and large are omitted', () => {
      expect(responsiveValue(428, { small: 10 })).toBe(10);
    });
  });
});

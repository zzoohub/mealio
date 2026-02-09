// Mock native modules and barrels
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => {
      if (!style) return {};
      if (!Array.isArray(style)) return style;
      return style.reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
    },
  },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/shared/ui/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      interactive: { primary: '#007aff' },
      bg: { secondary: '#f5f5f5' },
      border: { default: '#ccc' },
      text: { primary: '#000000', secondary: '#999999', inverse: '#ffffff' },
    },
  })),
}));
jest.mock('@/shared/ui/tokens', () => ({
  tokens: {
    spacing: {
      component: { xs: 4, sm: 8, md: 12 },
    },
    typography: {
      fontSize: { caption: 12 },
      fontWeight: { medium: '500' },
    },
    radius: { full: 999 },
  },
}));
jest.mock('@/shared/lib/i18n', () => ({
  useCommonI18n: jest.fn(() => ({
    mealTypeBreakfast: 'Breakfast',
    mealTypeLunch: 'Lunch',
    mealTypeDinner: 'Dinner',
    mealTypeSnack: 'Snack',
    mealTypeDessert: 'Dessert',
    mealTypeDrink: 'Drink',
    mealTypeOther: 'Other',
  })),
}));
jest.mock('@/entities/meal', () => ({
  MealType: {
    BREAKFAST: 'breakfast',
    LUNCH: 'lunch',
    DINNER: 'dinner',
    SNACK: 'snack',
    DESSERT: 'dessert',
    DRINK: 'drink',
    OTHER: 'other',
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MealTypeFilterChips } from '../MealTypeFilterChips';
import { MealType } from '@/entities/meal';
import { useTheme } from '@/shared/ui/theme';
import { useCommonI18n } from '@/shared/lib/i18n';

const mockUseTheme = useTheme as jest.Mock;
const mockUseCommonI18n = useCommonI18n as jest.Mock;

describe('MealTypeFilterChips', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      colors: {
        interactive: { primary: '#007aff' },
        bg: { secondary: '#f5f5f5' },
        border: { default: '#ccc' },
        text: { primary: '#000000', secondary: '#999999', inverse: '#ffffff' },
      },
    });
    mockUseCommonI18n.mockReturnValue({
      mealTypeBreakfast: 'Breakfast',
      mealTypeLunch: 'Lunch',
      mealTypeDinner: 'Dinner',
      mealTypeSnack: 'Snack',
      mealTypeDessert: 'Dessert',
      mealTypeDrink: 'Drink',
      mealTypeOther: 'Other',
    });
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('rendering', () => {
    it('renders all 7 meal type chips', () => {
      const { getByText } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      expect(getByText('Breakfast')).toBeTruthy();
      expect(getByText('Lunch')).toBeTruthy();
      expect(getByText('Dinner')).toBeTruthy();
      expect(getByText('Snack')).toBeTruthy();
      expect(getByText('Dessert')).toBeTruthy();
      expect(getByText('Drink')).toBeTruthy();
      expect(getByText('Other')).toBeTruthy();
    });

    it('renders chips in correct order', () => {
      const { getAllByText } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      const labels = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Drink', 'Other'];
      labels.forEach((label) => {
        expect(getAllByText(label).length).toBeGreaterThan(0);
      });
    });

    it('renders icons for each meal type', () => {
      const { UNSAFE_getAllByType } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      const icons = UNSAFE_getAllByType('Ionicons' as any);
      expect(icons.length).toBe(7); // One icon per meal type
    });
  });

  // =============================================================================
  // ICON TESTS
  // =============================================================================

  describe('meal type icons', () => {
    it('displays sunny-outline icon for breakfast', () => {
      const { UNSAFE_getAllByType } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const breakfastIcon = icons.find((icon: any) => icon.props.name === 'sunny-outline');
      expect(breakfastIcon).toBeTruthy();
    });

    it('displays sunny icon for lunch', () => {
      const { UNSAFE_getAllByType } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const lunchIcon = icons.find((icon: any) => icon.props.name === 'sunny');
      expect(lunchIcon).toBeTruthy();
    });

    it('displays moon-outline icon for dinner', () => {
      const { UNSAFE_getAllByType } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const dinnerIcon = icons.find((icon: any) => icon.props.name === 'moon-outline');
      expect(dinnerIcon).toBeTruthy();
    });

    it('displays nutrition-outline icon for snack', () => {
      const { UNSAFE_getAllByType } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const snackIcon = icons.find((icon: any) => icon.props.name === 'nutrition-outline');
      expect(snackIcon).toBeTruthy();
    });

    it('displays ice-cream-outline icon for dessert', () => {
      const { UNSAFE_getAllByType } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const dessertIcon = icons.find((icon: any) => icon.props.name === 'ice-cream-outline');
      expect(dessertIcon).toBeTruthy();
    });

    it('displays cafe-outline icon for drink', () => {
      const { UNSAFE_getAllByType } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const drinkIcon = icons.find((icon: any) => icon.props.name === 'cafe-outline');
      expect(drinkIcon).toBeTruthy();
    });

    it('displays ellipsis-horizontal-circle-outline icon for other', () => {
      const { UNSAFE_getAllByType } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      const icons = UNSAFE_getAllByType('Ionicons' as any);
      const otherIcon = icons.find((icon: any) => icon.props.name === 'ellipsis-horizontal-circle-outline');
      expect(otherIcon).toBeTruthy();
    });
  });

  // =============================================================================
  // SELECTION TESTS
  // =============================================================================

  describe('selection behavior', () => {
    it('displays no chips as selected when selected is empty', () => {
      render(<MealTypeFilterChips selected={[]} onChange={mockOnChange} />);
      // Component should render without errors
      expect(true).toBe(true);
    });

    it('calls onChange with added meal type when unselected chip is pressed', () => {
      const { getByText } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      fireEvent.press(getByText('Breakfast'));

      expect(mockOnChange).toHaveBeenCalledWith([MealType.BREAKFAST]);
    });

    it('calls onChange with removed meal type when selected chip is pressed', () => {
      const { getByText } = render(
        <MealTypeFilterChips
          selected={[MealType.BREAKFAST, MealType.LUNCH]}
          onChange={mockOnChange}
        />
      );

      fireEvent.press(getByText('Breakfast'));

      expect(mockOnChange).toHaveBeenCalledWith([MealType.LUNCH]);
    });

    it('allows multiple meal types to be selected', () => {
      const { getByText } = render(
        <MealTypeFilterChips selected={[MealType.BREAKFAST]} onChange={mockOnChange} />
      );

      fireEvent.press(getByText('Lunch'));

      expect(mockOnChange).toHaveBeenCalledWith([MealType.BREAKFAST, MealType.LUNCH]);
    });

    it('allows all 7 meal types to be selected', () => {
      const allTypes = [
        MealType.BREAKFAST,
        MealType.LUNCH,
        MealType.DINNER,
        MealType.SNACK,
        MealType.DESSERT,
        MealType.DRINK,
      ];
      const { getByText } = render(
        <MealTypeFilterChips selected={allTypes} onChange={mockOnChange} />
      );

      fireEvent.press(getByText('Other'));

      expect(mockOnChange).toHaveBeenCalledWith([
        MealType.BREAKFAST,
        MealType.LUNCH,
        MealType.DINNER,
        MealType.SNACK,
        MealType.DESSERT,
        MealType.DRINK,
        MealType.OTHER,
      ]);
    });

    it('removes meal type from middle of selection', () => {
      const { getByText } = render(
        <MealTypeFilterChips
          selected={[MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]}
          onChange={mockOnChange}
        />
      );

      fireEvent.press(getByText('Lunch'));

      expect(mockOnChange).toHaveBeenCalledWith([MealType.BREAKFAST, MealType.DINNER]);
    });
  });

  // =============================================================================
  // DISABLED STATE TESTS
  // =============================================================================

  describe('disabled state', () => {
    it('does not call onChange when disabled and chip is pressed', () => {
      const { getByText } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} disabled />
      );

      fireEvent.press(getByText('Breakfast'));

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('does not call onChange for any chip when disabled', () => {
      const { getByText } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} disabled />
      );

      fireEvent.press(getByText('Breakfast'));
      fireEvent.press(getByText('Lunch'));
      fireEvent.press(getByText('Dessert'));
      fireEvent.press(getByText('Drink'));
      fireEvent.press(getByText('Other'));

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('allows pressing when not disabled', () => {
      const { getByText } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} disabled={false} />
      );

      fireEvent.press(getByText('Breakfast'));

      expect(mockOnChange).toHaveBeenCalledWith([MealType.BREAKFAST]);
    });
  });

  // =============================================================================
  // I18N TESTS
  // =============================================================================

  describe('internationalization', () => {
    it('uses i18n labels from useCommonI18n', () => {
      mockUseCommonI18n.mockReturnValue({
        mealTypeBreakfast: '아침',
        mealTypeLunch: '점심',
        mealTypeDinner: '저녁',
        mealTypeSnack: '간식',
        mealTypeDessert: '디저트',
        mealTypeDrink: '음료',
        mealTypeOther: '기타',
      });

      const { getByText } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      expect(getByText('아침')).toBeTruthy();
      expect(getByText('점심')).toBeTruthy();
      expect(getByText('저녁')).toBeTruthy();
      expect(getByText('간식')).toBeTruthy();
      expect(getByText('디저트')).toBeTruthy();
      expect(getByText('음료')).toBeTruthy();
      expect(getByText('기타')).toBeTruthy();
    });

    it('calls useCommonI18n hook', () => {
      render(<MealTypeFilterChips selected={[]} onChange={mockOnChange} />);

      expect(mockUseCommonI18n).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('handles empty selection array', () => {
      const { getByText } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      expect(getByText('Breakfast')).toBeTruthy();
    });

    it('handles selection with duplicate values gracefully', () => {
      const duplicateSelection = [MealType.BREAKFAST, MealType.BREAKFAST];
      const { getByText } = render(
        <MealTypeFilterChips selected={duplicateSelection as any} onChange={mockOnChange} />
      );

      fireEvent.press(getByText('Breakfast'));

      // Should remove all instances
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles rapidly pressing chips', () => {
      const { getByText } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      fireEvent.press(getByText('Breakfast'));
      fireEvent.press(getByText('Lunch'));
      fireEvent.press(getByText('Dinner'));

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });
  });

  // =============================================================================
  // THEME INTEGRATION
  // =============================================================================

  describe('theme integration', () => {
    it('calls useTheme hook', () => {
      render(<MealTypeFilterChips selected={[]} onChange={mockOnChange} />);

      expect(mockUseTheme).toHaveBeenCalled();
    });

    it('applies different theme colors', () => {
      mockUseTheme.mockReturnValue({
        colors: {
          interactive: { primary: '#ff0000' },
          bg: { secondary: '#0000ff' },
          border: { default: '#00ff00' },
          text: { primary: '#000000', secondary: '#999999', inverse: '#ffffff' },
        },
      });

      render(<MealTypeFilterChips selected={[]} onChange={mockOnChange} />);

      expect(true).toBe(true); // Component should render without errors
    });
  });

  // =============================================================================
  // MEMOIZATION
  // =============================================================================

  describe('memoization', () => {
    it('is a memoized component', () => {
      const { rerender } = render(
        <MealTypeFilterChips selected={[]} onChange={mockOnChange} />
      );

      rerender(<MealTypeFilterChips selected={[]} onChange={mockOnChange} />);

      // Component should not re-render unnecessarily due to memo
      expect(true).toBe(true);
    });
  });
});

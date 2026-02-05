// Mock modules before any imports
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ActionSheetIOS: {
    showActionSheetWithOptions: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj: any) => obj.ios),
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

jest.mock('@/shared/ui/styled', () => ({
  BottomSheet: jest.fn(),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: jest.fn(({ value, onChange, testID }) => {
      return React.createElement('DateTimePicker', { value, onChange, testID });
    }),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const mockColors = {
  bg: { primary: '#ffffff' },
  border: { default: '#ccc', divider: '#ddd' },
  text: { tertiary: '#666' },
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
      component: { sm: 8, md: 16, xl: 32 },
    },
    typography: {
      fontSize: { caption: 12, body: 14 },
      fontWeight: { normal: '400', semibold: '600' },
    },
    borderWidth: { default: 1 },
  },
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

jest.mock('@/shared/lib/i18n', () => ({
  useCommonI18n: jest.fn(),
  useDiaryI18n: jest.fn(),
  getCurrentLanguage: jest.fn(() => 'en'),
}));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Platform, ActionSheetIOS, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BottomSheet } from '@/shared/ui/styled';
import { EntryContextBar } from '../EntryContextBar';
import { MealType } from '@/entities/meal';
import { useCommonI18n, useDiaryI18n } from '@/shared/lib/i18n';
import { useStyles } from '@/shared/ui/theme';

describe('EntryContextBar', () => {
  const mockOnMealTypeChange = jest.fn();
  const mockOnTimestampChange = jest.fn();
  const mockTimestamp = new Date(2026, 0, 15, 14, 30, 0);

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';

    // Re-apply mocks (resetMocks: true clears implementations before each test)
    (useStyles as jest.Mock).mockImplementation(useStylesImpl);

    (BottomSheet as jest.Mock).mockImplementation(({ children }: any) => children);

    (DateTimePicker as jest.Mock).mockImplementation(({ value, onChange, testID }: any) => {
      const React = require('react');
      return React.createElement('DateTimePicker', { value, onChange, testID });
    });

    // Setup i18n mocks
    (useCommonI18n as jest.Mock).mockReturnValue({
      mealTypeBreakfast: 'Breakfast',
      mealTypeLunch: 'Lunch',
      mealTypeDinner: 'Dinner',
      mealTypeSnack: 'Snack',
      mealTypeDessert: 'Dessert',
      mealTypeDrink: 'Drink',
      mealTypeOther: 'Other',
      mealTypeMeal: 'Meal',
      cancel: 'Cancel',
      done: 'Done',
    });

    (useDiaryI18n as jest.Mock).mockReturnValue({
      mealTypeSelect: 'Select Meal Type',
      mealTypeAccessibility: (label: string) => `Meal type: ${label}`,
      changeDateTime: 'Change date and time',
    });
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('rendering', () => {
    it('renders meal type, time, and location when all provided', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          location={{ address: 'Cafe Mealio, 123 Main St' }}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      expect(getByText('Lunch')).toBeTruthy();
      expect(getByText('2:30 PM')).toBeTruthy();
      expect(getByText('Cafe Mealio')).toBeTruthy();
    });

    it('renders without location when not provided', () => {
      const { getByText, queryByText } = render(
        <EntryContextBar
          mealType={MealType.BREAKFAST}
          timestamp={mockTimestamp}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      expect(getByText('Breakfast')).toBeTruthy();
      expect(queryByText('Cafe Mealio')).toBeNull();
    });

    it('renders without location when location is null', () => {
      const { queryByText } = render(
        <EntryContextBar
          mealType={MealType.DINNER}
          timestamp={mockTimestamp}
          location={null}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      expect(queryByText(/Cafe/)).toBeNull();
    });

    it('extracts first part of address for location label', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.SNACK}
          timestamp={mockTimestamp}
          location={{ address: 'Starbucks, 456 Oak Ave, Seattle, WA' }}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      expect(getByText('Starbucks')).toBeTruthy();
    });
  });

  // =============================================================================
  // MEAL TYPE SELECTION TESTS
  // =============================================================================

  describe('meal type selection', () => {
    it('shows chevron-down icon when onMealTypeChange is provided', () => {
      const { UNSAFE_queryAllByType } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      // Component should render at least one Ionicons with chevron-down
      const icons = UNSAFE_queryAllByType('Ionicons' as any);
      const chevron = icons.find((icon: any) => icon.props.name === 'chevron-down');
      expect(chevron).toBeTruthy();
    });

    it('does not show chevron-down icon when onMealTypeChange is not provided', () => {
      const { queryByTestId } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
        />
      );

      // Meal type should be in a plain View, not Pressable
      expect(queryByTestId('meal-type-pressable')).toBeNull();
    });

    it('opens iOS ActionSheet when meal type pressed on iOS', () => {
      (Platform as any).OS = 'ios';
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      fireEvent.press(getByText('Lunch'));

      expect(ActionSheetIOS.showActionSheetWithOptions).toHaveBeenCalledWith(
        {
          options: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Drink', 'Other', 'Cancel'],
          cancelButtonIndex: 7,
          title: 'Select Meal Type',
        },
        expect.any(Function)
      );
    });

    it('opens Android Alert when meal type pressed on Android', () => {
      (Platform as any).OS = 'android';
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      fireEvent.press(getByText('Lunch'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Select Meal Type',
        undefined,
        [
          { text: 'Breakfast', onPress: expect.any(Function) },
          { text: 'Lunch', onPress: expect.any(Function) },
          { text: 'Dinner', onPress: expect.any(Function) },
          { text: 'Snack', onPress: expect.any(Function) },
          { text: 'Dessert', onPress: expect.any(Function) },
          { text: 'Drink', onPress: expect.any(Function) },
          { text: 'Other', onPress: expect.any(Function) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    });

    it('calls onMealTypeChange when iOS ActionSheet option selected', () => {
      (Platform as any).OS = 'ios';
      (ActionSheetIOS.showActionSheetWithOptions as jest.Mock).mockImplementation(
        (options, callback) => {
          // Simulate selecting "Dinner" (index 2)
          callback(2);
        }
      );

      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      fireEvent.press(getByText('Lunch'));

      expect(mockOnMealTypeChange).toHaveBeenCalledWith(MealType.DINNER);
    });

    it('calls onMealTypeChange when Android Alert option selected', () => {
      (Platform as any).OS = 'android';
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        // Simulate pressing "Snack" button
        buttons[3].onPress();
      });

      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      fireEvent.press(getByText('Lunch'));

      expect(mockOnMealTypeChange).toHaveBeenCalledWith(MealType.SNACK);
    });

    it('does not call onMealTypeChange when iOS ActionSheet cancelled', () => {
      (Platform as any).OS = 'ios';
      (ActionSheetIOS.showActionSheetWithOptions as jest.Mock).mockImplementation(
        (options, callback) => {
          // Simulate pressing cancel (index 7 now with 7 meal types)
          callback(7);
        }
      );

      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      fireEvent.press(getByText('Lunch'));

      expect(mockOnMealTypeChange).not.toHaveBeenCalled();
    });

    it('does not open ActionSheet when disabled', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onMealTypeChange={mockOnMealTypeChange}
          disabled
        />
      );

      fireEvent.press(getByText('Lunch'));

      expect(ActionSheetIOS.showActionSheetWithOptions).not.toHaveBeenCalled();
    });

    it('does not open ActionSheet when onMealTypeChange not provided', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
        />
      );

      // This should not throw since meal type is not pressable
      expect(() => fireEvent.press(getByText('Lunch'))).not.toThrow();
      expect(ActionSheetIOS.showActionSheetWithOptions).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // TIMESTAMP SELECTION TESTS
  // =============================================================================

  describe('timestamp selection', () => {
    it('renders time as Pressable with chevron when onTimestampChange provided', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
        />
      );

      const timeElement = getByText('2:30 PM');
      expect(timeElement).toBeTruthy();
    });

    it('renders time as plain View when onTimestampChange not provided', () => {
      (BottomSheet as jest.Mock).mockClear();
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
        />
      );

      const timeElement = getByText('2:30 PM');
      expect(timeElement).toBeTruthy();
      // BottomSheet should not be rendered without onTimestampChange
      expect(BottomSheet).not.toHaveBeenCalled();
    });

    it('shows time picker in BottomSheet on iOS when time pressed', () => {
      (Platform as any).OS = 'ios';
      (BottomSheet as jest.Mock).mockClear();
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
        />
      );

      // BottomSheet should start with visible=false
      const initialCall = (BottomSheet as jest.Mock).mock.calls[0];
      expect(initialCall[0].visible).toBe(false);

      fireEvent.press(getByText('2:30 PM'));

      // BottomSheet should now be called with visible=true
      const lastCall = (BottomSheet as jest.Mock).mock.calls.at(-1);
      expect(lastCall[0].visible).toBe(true);
    });

    it('opens DateTimePicker on Android when time pressed', () => {
      (Platform as any).OS = 'android';
      (DateTimePicker as jest.Mock).mockClear();
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
        />
      );

      // DateTimePicker should not be rendered initially on Android
      expect(DateTimePicker).not.toHaveBeenCalled();

      fireEvent.press(getByText('2:30 PM'));

      // DateTimePicker should be rendered after press
      expect(DateTimePicker).toHaveBeenCalled();
    });

    it('renders DateTimePicker with mode="time"', () => {
      (Platform as any).OS = 'ios';
      (DateTimePicker as jest.Mock).mockClear();

      render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
        />
      );

      expect(DateTimePicker).toHaveBeenCalled();
      const call = (DateTimePicker as jest.Mock).mock.calls[0]!;
      expect(call[0].mode).toBe('time');
    });

    it('calls onTimestampChange with merged time on iOS', () => {
      (Platform as any).OS = 'ios';
      mockOnTimestampChange.mockClear();
      (DateTimePicker as jest.Mock).mockClear();
      // Selected time: 10:15 — should be merged with mockTimestamp's date (Jan 15, 2026)
      const selectedTime = new Date(2025, 0, 10, 10, 15, 0);

      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
        />
      );

      fireEvent.press(getByText('2:30 PM'));

      // Get the onChange callback passed to DateTimePicker
      const lastCall = (DateTimePicker as jest.Mock).mock.calls.at(-1)!;
      const onChangeFn = lastCall[0].onChange;
      expect(onChangeFn).toBeDefined();
      onChangeFn({ type: 'set' }, selectedTime);

      // Should merge selected hours/minutes with the entry's original date
      const expectedDate = new Date(2026, 0, 15, 10, 15, 0, 0);
      expect(mockOnTimestampChange).toHaveBeenCalledWith(expectedDate);
    });

    it('handles iOS picker dismissal without calling onTimestampChange', () => {
      (Platform as any).OS = 'ios';
      mockOnTimestampChange.mockClear();

      let dismissed = false;
      (DateTimePicker as jest.Mock).mockImplementation(({ onChange }) => {
        if (!dismissed) {
          dismissed = true;
          onChange({ type: 'dismissed' });
        }
        return null;
      });

      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
        />
      );

      fireEvent.press(getByText('2:30 PM'));

      expect(mockOnTimestampChange).not.toHaveBeenCalled();
    });

    it('calls onTimestampChange with merged time on Android', () => {
      (Platform as any).OS = 'android';
      mockOnTimestampChange.mockClear();
      (DateTimePicker as jest.Mock).mockClear();

      let onChangeFn: any;
      (DateTimePicker as jest.Mock).mockImplementation(({ onChange }) => {
        onChangeFn = onChange;
        return null;
      });

      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
        />
      );

      fireEvent.press(getByText('2:30 PM'));

      // Simulate time selection (16:00)
      expect(onChangeFn).toBeDefined();
      onChangeFn({ type: 'set' }, new Date(2026, 0, 15, 16, 0, 0));

      // Should merge selected time with entry's date
      const expectedDate = new Date(2026, 0, 15, 16, 0, 0, 0);
      expect(mockOnTimestampChange).toHaveBeenCalledWith(expectedDate);
    });

    it('dismisses iOS picker via onClose callback', () => {
      (Platform as any).OS = 'ios';
      (BottomSheet as jest.Mock).mockClear();
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
        />
      );

      // Open picker
      fireEvent.press(getByText('2:30 PM'));
      expect((BottomSheet as jest.Mock).mock.calls.at(-1)![0].visible).toBe(true);

      // Simulate BottomSheet onClose (backdrop tap or Done press)
      const onClose = (BottomSheet as jest.Mock).mock.calls.at(-1)![0].onClose;
      act(() => { onClose(); });

      // BottomSheet should now be called with visible=false
      expect((BottomSheet as jest.Mock).mock.calls.at(-1)![0].visible).toBe(false);
    });

    it('does not open picker when disabled', () => {
      (Platform as any).OS = 'ios';
      (BottomSheet as jest.Mock).mockClear();
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
          disabled
        />
      );

      fireEvent.press(getByText('2:30 PM'));

      // BottomSheet should remain not visible because handler returns early when disabled
      const lastCall = (BottomSheet as jest.Mock).mock.calls.at(-1);
      expect(lastCall[0].visible).toBe(false);
    });

    it('passes maximumDate prop to DateTimePicker on iOS', () => {
      (Platform as any).OS = 'ios';
      (DateTimePicker as jest.Mock).mockClear();

      render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
        />
      );

      expect(DateTimePicker).toHaveBeenCalled();
      const call = (DateTimePicker as jest.Mock).mock.calls[0]!;
      expect(call[0].maximumDate).toBeInstanceOf(Date);
    });
  });

  // =============================================================================
  // TIME FORMATTING TESTS
  // =============================================================================

  describe('time formatting', () => {
    it('formats morning time correctly', () => {
      const morningTime = new Date(2026, 0, 15, 8, 0, 0);
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.BREAKFAST}
          timestamp={morningTime}
        />
      );

      expect(getByText('8:00 AM')).toBeTruthy();
    });

    it('formats afternoon time correctly', () => {
      const afternoonTime = new Date(2026, 0, 15, 14, 45, 0);
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={afternoonTime}
        />
      );

      expect(getByText('2:45 PM')).toBeTruthy();
    });

    it('formats evening time correctly', () => {
      const eveningTime = new Date(2026, 0, 15, 19, 30, 0);
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.DINNER}
          timestamp={eveningTime}
        />
      );

      expect(getByText('7:30 PM')).toBeTruthy();
    });

    it('formats midnight correctly', () => {
      const midnight = new Date(2026, 0, 15, 0, 0, 0);
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.SNACK}
          timestamp={midnight}
        />
      );

      expect(getByText('12:00 AM')).toBeTruthy();
    });

    it('formats noon correctly', () => {
      const noon = new Date(2026, 0, 15, 12, 0, 0);
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={noon}
        />
      );

      expect(getByText('12:00 PM')).toBeTruthy();
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('accessibility', () => {
    it('sets proper accessibility label for container', () => {
      const { getByLabelText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          location={{ address: 'Cafe Mealio, 123 Main St' }}
        />
      );

      expect(getByLabelText('Lunch at 2:30 PM, at Cafe Mealio')).toBeTruthy();
    });

    it('sets accessibility label without location', () => {
      const { getByLabelText } = render(
        <EntryContextBar
          mealType={MealType.BREAKFAST}
          timestamp={mockTimestamp}
        />
      );

      expect(getByLabelText('Breakfast at 2:30 PM')).toBeTruthy();
    });

    it('sets accessibility role for meal type button', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onMealTypeChange={mockOnMealTypeChange}
        />
      );

      const mealTypeButton = getByText('Lunch').parent;
      expect(mealTypeButton?.props.accessibilityRole).toBe('button');
    });

    it('sets accessibility role for timestamp button', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          onTimestampChange={mockOnTimestampChange}
        />
      );

      const timeButton = getByText('2:30 PM').parent;
      expect(timeButton?.props.accessibilityRole).toBe('button');
    });
  });

  // =============================================================================
  // MEAL TYPE LABEL TESTS
  // =============================================================================

  describe('meal type labels', () => {
    it('displays correct label for BREAKFAST', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.BREAKFAST}
          timestamp={mockTimestamp}
        />
      );

      expect(getByText('Breakfast')).toBeTruthy();
    });

    it('displays correct label for LUNCH', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
        />
      );

      expect(getByText('Lunch')).toBeTruthy();
    });

    it('displays correct label for DINNER', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.DINNER}
          timestamp={mockTimestamp}
        />
      );

      expect(getByText('Dinner')).toBeTruthy();
    });

    it('displays correct label for SNACK', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.SNACK}
          timestamp={mockTimestamp}
        />
      );

      expect(getByText('Snack')).toBeTruthy();
    });

    it('displays correct label for DESSERT', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.DESSERT}
          timestamp={mockTimestamp}
        />
      );

      expect(getByText('Dessert')).toBeTruthy();
    });

    it('displays correct label for DRINK', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.DRINK}
          timestamp={mockTimestamp}
        />
      );

      expect(getByText('Drink')).toBeTruthy();
    });

    it('displays correct label for OTHER', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.OTHER}
          timestamp={mockTimestamp}
        />
      );

      expect(getByText('Other')).toBeTruthy();
    });

    it('displays "Meal" for unknown meal type', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType="unknown"
          timestamp={mockTimestamp}
        />
      );

      expect(getByText('Meal')).toBeTruthy();
    });
  });

  // =============================================================================
  // MEAL TYPE ICON TESTS
  // =============================================================================

  describe('meal type icons', () => {
    it('displays correct icon for BREAKFAST', () => {
      const { UNSAFE_queryAllByType } = render(
        <EntryContextBar
          mealType={MealType.BREAKFAST}
          timestamp={mockTimestamp}
        />
      );

      const icons = UNSAFE_queryAllByType('Ionicons' as any);
      const icon = icons.find((icon: any) => icon.props.name === 'sunny-outline');
      expect(icon).toBeTruthy();
    });

    it('displays correct icon for LUNCH', () => {
      const { UNSAFE_queryAllByType } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
        />
      );

      const icons = UNSAFE_queryAllByType('Ionicons' as any);
      const icon = icons.find((icon: any) => icon.props.name === 'sunny');
      expect(icon).toBeTruthy();
    });

    it('displays correct icon for DINNER', () => {
      const { UNSAFE_queryAllByType } = render(
        <EntryContextBar
          mealType={MealType.DINNER}
          timestamp={mockTimestamp}
        />
      );

      const icons = UNSAFE_queryAllByType('Ionicons' as any);
      const icon = icons.find((icon: any) => icon.props.name === 'moon-outline');
      expect(icon).toBeTruthy();
    });

    it('displays correct icon for SNACK', () => {
      const { UNSAFE_queryAllByType } = render(
        <EntryContextBar
          mealType={MealType.SNACK}
          timestamp={mockTimestamp}
        />
      );

      const icons = UNSAFE_queryAllByType('Ionicons' as any);
      const icon = icons.find((icon: any) => icon.props.name === 'nutrition-outline');
      expect(icon).toBeTruthy();
    });

    it('displays correct icon for DESSERT', () => {
      const { UNSAFE_queryAllByType } = render(
        <EntryContextBar
          mealType={MealType.DESSERT}
          timestamp={mockTimestamp}
        />
      );

      const icons = UNSAFE_queryAllByType('Ionicons' as any);
      const icon = icons.find((icon: any) => icon.props.name === 'ice-cream-outline');
      expect(icon).toBeTruthy();
    });

    it('displays correct icon for DRINK', () => {
      const { UNSAFE_queryAllByType } = render(
        <EntryContextBar
          mealType={MealType.DRINK}
          timestamp={mockTimestamp}
        />
      );

      const icons = UNSAFE_queryAllByType('Ionicons' as any);
      const icon = icons.find((icon: any) => icon.props.name === 'cafe-outline');
      expect(icon).toBeTruthy();
    });

    it('displays correct icon for OTHER', () => {
      const { UNSAFE_queryAllByType } = render(
        <EntryContextBar
          mealType={MealType.OTHER}
          timestamp={mockTimestamp}
        />
      );

      const icons = UNSAFE_queryAllByType('Ionicons' as any);
      const icon = icons.find((icon: any) => icon.props.name === 'ellipsis-horizontal-circle-outline');
      expect(icon).toBeTruthy();
    });

    it('displays fallback icon for unknown meal type', () => {
      const { UNSAFE_queryAllByType } = render(
        <EntryContextBar
          mealType="unknown"
          timestamp={mockTimestamp}
        />
      );

      const icons = UNSAFE_queryAllByType('Ionicons' as any);
      const icon = icons.find((icon: any) => icon.props.name === 'restaurant-outline');
      expect(icon).toBeTruthy();
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('handles empty location address', () => {
      const { getAllByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          location={{ address: '' } as any}
        />
      );

      // Component still renders (meal type and time are visible)
      expect(getAllByText(/./)).toBeTruthy();
    });

    it('handles location without address', () => {
      const { queryByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          location={{} as any}
        />
      );

      // Should not crash
      expect(queryByText('Lunch')).toBeTruthy();
    });

    it('handles testID prop', () => {
      const { getByTestId } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          testID="entry-context-bar"
        />
      );

      expect(getByTestId('entry-context-bar')).toBeTruthy();
    });

    it('handles undefined location gracefully', () => {
      const { getByText } = render(
        <EntryContextBar
          mealType={MealType.LUNCH}
          timestamp={mockTimestamp}
          location={undefined}
        />
      );

      expect(getByText('Lunch')).toBeTruthy();
    });
  });
});

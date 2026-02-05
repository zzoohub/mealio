// Mock i18n module
jest.mock('@/shared/lib/i18n', () => ({
  getCurrentLanguage: jest.fn(() => 'en'),
}));

import {
  getWeekDays,
  isSameDay,
  formatTime,
  getMealTypeEmoji,
  getMealTypeLabel,
  formatDateToString,
  getDayName,
  DAY_NAMES_EN,
  DAY_NAMES_KO,
} from '../dateUtils';
import { getCurrentLanguage } from '@/shared/lib/i18n';

const mockGetCurrentLanguage = getCurrentLanguage as jest.Mock;

describe('dateUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentLanguage.mockReturnValue('en');
  });

  // =============================================================================
  // getWeekDays
  // =============================================================================

  describe('getWeekDays', () => {
    it('returns 7 days starting from Sunday', () => {
      const date = new Date(2024, 0, 10); // January 10, 2024 (Wednesday)
      const days = getWeekDays(date);

      expect(days).toHaveLength(7);
      expect(days[0].getDay()).toBe(0); // Sunday
      expect(days[6].getDay()).toBe(6); // Saturday
    });

    it('returns correct week for a Monday', () => {
      const date = new Date(2024, 0, 8); // January 8, 2024 (Monday)
      const days = getWeekDays(date);

      expect(days[0].getDate()).toBe(7); // Sunday
      expect(days[1].getDate()).toBe(8); // Monday
      expect(days[6].getDate()).toBe(13); // Saturday
    });

    it('returns correct week for a Sunday', () => {
      const date = new Date(2024, 0, 7); // January 7, 2024 (Sunday)
      const days = getWeekDays(date);

      expect(days[0].getDate()).toBe(7); // Same Sunday
      expect(days[6].getDate()).toBe(13); // Saturday
    });

    it('handles month boundaries correctly', () => {
      const date = new Date(2024, 0, 31); // January 31, 2024 (Wednesday)
      const days = getWeekDays(date);

      expect(days[0].getMonth()).toBe(0); // January
      expect(days[6].getMonth()).toBe(1); // February
    });
  });

  // =============================================================================
  // isSameDay
  // =============================================================================

  describe('isSameDay', () => {
    it('returns true for same date', () => {
      const date1 = new Date(2024, 0, 10, 10, 0, 0);
      const date2 = new Date(2024, 0, 10, 15, 30, 0);

      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('returns false for different dates', () => {
      const date1 = new Date(2024, 0, 10);
      const date2 = new Date(2024, 0, 11);

      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('returns false for different months', () => {
      const date1 = new Date(2024, 0, 10);
      const date2 = new Date(2024, 1, 10);

      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('returns false for different years', () => {
      const date1 = new Date(2024, 0, 10);
      const date2 = new Date(2025, 0, 10);

      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('returns true for midnight vs end of day', () => {
      const date1 = new Date(2024, 0, 10, 0, 0, 0);
      const date2 = new Date(2024, 0, 10, 23, 59, 59);

      expect(isSameDay(date1, date2)).toBe(true);
    });
  });

  // =============================================================================
  // formatTime
  // =============================================================================

  describe('formatTime', () => {
    it('formats time in 12-hour format with AM/PM', () => {
      const date = new Date(2024, 0, 10, 14, 30, 0);
      const result = formatTime(date);

      expect(result).toMatch(/PM/);
      expect(result).toMatch(/2:30/);
    });

    it('formats morning time with AM', () => {
      const date = new Date(2024, 0, 10, 9, 15, 0);
      const result = formatTime(date);

      expect(result).toMatch(/AM/);
      expect(result).toMatch(/9:15/);
    });

    it('formats midnight correctly', () => {
      const date = new Date(2024, 0, 10, 0, 0, 0);
      const result = formatTime(date);

      expect(result).toMatch(/12:00/);
      expect(result).toMatch(/AM/);
    });

    it('formats noon correctly', () => {
      const date = new Date(2024, 0, 10, 12, 0, 0);
      const result = formatTime(date);

      expect(result).toMatch(/12:00/);
      expect(result).toMatch(/PM/);
    });

    it('uses default locale when not provided', () => {
      mockGetCurrentLanguage.mockReturnValue('ko-KR');
      const date = new Date(2024, 0, 10, 14, 30, 0);

      formatTime(date);

      expect(mockGetCurrentLanguage).toHaveBeenCalled();
    });

    it('uses provided locale when specified', () => {
      const date = new Date(2024, 0, 10, 14, 30, 0);
      const result = formatTime(date, 'en-US');

      expect(result).toBeTruthy();
    });
  });

  // =============================================================================
  // getMealTypeEmoji
  // =============================================================================

  describe('getMealTypeEmoji', () => {
    it('returns sunrise for breakfast', () => {
      expect(getMealTypeEmoji('breakfast')).toBe('sunrise');
    });

    it('returns sunny for lunch', () => {
      expect(getMealTypeEmoji('lunch')).toBe('sunny');
    });

    it('returns moon for dinner', () => {
      expect(getMealTypeEmoji('dinner')).toBe('moon');
    });

    it('returns nutrition for snack', () => {
      expect(getMealTypeEmoji('snack')).toBe('nutrition');
    });

    it('returns ice-cream for dessert', () => {
      expect(getMealTypeEmoji('dessert')).toBe('ice-cream');
    });

    it('returns cafe for drink', () => {
      expect(getMealTypeEmoji('drink')).toBe('cafe');
    });

    it('returns ellipsis-horizontal-circle for other', () => {
      expect(getMealTypeEmoji('other')).toBe('ellipsis-horizontal-circle');
    });

    it('returns restaurant for unknown meal type', () => {
      expect(getMealTypeEmoji('unknown')).toBe('restaurant');
    });

    it('is case insensitive', () => {
      expect(getMealTypeEmoji('BREAKFAST')).toBe('sunrise');
      expect(getMealTypeEmoji('Lunch')).toBe('sunny');
      expect(getMealTypeEmoji('DiNnEr')).toBe('moon');
      expect(getMealTypeEmoji('DESSERT')).toBe('ice-cream');
      expect(getMealTypeEmoji('DRINK')).toBe('cafe');
      expect(getMealTypeEmoji('OTHER')).toBe('ellipsis-horizontal-circle');
    });

    it('handles empty string', () => {
      expect(getMealTypeEmoji('')).toBe('restaurant');
    });
  });

  // =============================================================================
  // getMealTypeLabel
  // =============================================================================

  describe('getMealTypeLabel', () => {
    it('returns breakfast for breakfast', () => {
      expect(getMealTypeLabel('breakfast')).toBe('breakfast');
    });

    it('returns lunch for lunch', () => {
      expect(getMealTypeLabel('lunch')).toBe('lunch');
    });

    it('returns dinner for dinner', () => {
      expect(getMealTypeLabel('dinner')).toBe('dinner');
    });

    it('returns snack for snack', () => {
      expect(getMealTypeLabel('snack')).toBe('snack');
    });

    it('returns dessert for dessert', () => {
      expect(getMealTypeLabel('dessert')).toBe('dessert');
    });

    it('returns drink for drink', () => {
      expect(getMealTypeLabel('drink')).toBe('drink');
    });

    it('returns other for other', () => {
      expect(getMealTypeLabel('other')).toBe('other');
    });

    it('returns meal for unknown type', () => {
      expect(getMealTypeLabel('unknown')).toBe('meal');
    });

    it('is case insensitive', () => {
      expect(getMealTypeLabel('BREAKFAST')).toBe('breakfast');
      expect(getMealTypeLabel('Lunch')).toBe('lunch');
      expect(getMealTypeLabel('DiNnEr')).toBe('dinner');
      expect(getMealTypeLabel('DESSERT')).toBe('dessert');
      expect(getMealTypeLabel('DRINK')).toBe('drink');
      expect(getMealTypeLabel('OTHER')).toBe('other');
    });

    it('handles empty string', () => {
      expect(getMealTypeLabel('')).toBe('meal');
    });
  });

  // =============================================================================
  // formatDateToString
  // =============================================================================

  describe('formatDateToString', () => {
    it('formats date to YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 10);
      expect(formatDateToString(date)).toBe('2024-01-10');
    });

    it('pads single digit months', () => {
      const date = new Date(2024, 0, 15);
      expect(formatDateToString(date)).toBe('2024-01-15');
    });

    it('pads single digit days', () => {
      const date = new Date(2024, 11, 5);
      expect(formatDateToString(date)).toBe('2024-12-05');
    });

    it('handles double digit months and days', () => {
      const date = new Date(2024, 9, 25);
      expect(formatDateToString(date)).toBe('2024-10-25');
    });

    it('handles first day of year', () => {
      const date = new Date(2024, 0, 1);
      expect(formatDateToString(date)).toBe('2024-01-01');
    });

    it('handles last day of year', () => {
      const date = new Date(2024, 11, 31);
      expect(formatDateToString(date)).toBe('2024-12-31');
    });
  });

  // =============================================================================
  // getDayName
  // =============================================================================

  describe('getDayName', () => {
    it('returns English day name by default', () => {
      expect(getDayName(0)).toBe('Sun');
      expect(getDayName(1)).toBe('Mon');
      expect(getDayName(6)).toBe('Sat');
    });

    it('returns Korean day name when locale is ko', () => {
      expect(getDayName(0, 'ko')).toBe('일');
      expect(getDayName(1, 'ko')).toBe('월');
      expect(getDayName(6, 'ko')).toBe('토');
    });

    it('returns English day name for non-ko locale', () => {
      expect(getDayName(0, 'en')).toBe('Sun');
      expect(getDayName(0, 'en-US')).toBe('Sun');
      expect(getDayName(0, 'fr')).toBe('Sun');
    });

    it('handles all days of week in English', () => {
      expect(getDayName(0, 'en')).toBe('Sun');
      expect(getDayName(1, 'en')).toBe('Mon');
      expect(getDayName(2, 'en')).toBe('Tue');
      expect(getDayName(3, 'en')).toBe('Wed');
      expect(getDayName(4, 'en')).toBe('Thu');
      expect(getDayName(5, 'en')).toBe('Fri');
      expect(getDayName(6, 'en')).toBe('Sat');
    });

    it('handles all days of week in Korean', () => {
      expect(getDayName(0, 'ko')).toBe('일');
      expect(getDayName(1, 'ko')).toBe('월');
      expect(getDayName(2, 'ko')).toBe('화');
      expect(getDayName(3, 'ko')).toBe('수');
      expect(getDayName(4, 'ko')).toBe('목');
      expect(getDayName(5, 'ko')).toBe('금');
      expect(getDayName(6, 'ko')).toBe('토');
    });

    it('handles invalid index gracefully', () => {
      expect(getDayName(7, 'en')).toBe('');
      expect(getDayName(-1, 'en')).toBe('');
    });
  });

  // =============================================================================
  // DAY_NAMES Constants
  // =============================================================================

  describe('DAY_NAMES constants', () => {
    it('DAY_NAMES_EN has 7 days', () => {
      expect(DAY_NAMES_EN).toHaveLength(7);
    });

    it('DAY_NAMES_KO has 7 days', () => {
      expect(DAY_NAMES_KO).toHaveLength(7);
    });

    it('DAY_NAMES_EN starts with Sunday', () => {
      expect(DAY_NAMES_EN[0]).toBe('Sun');
    });

    it('DAY_NAMES_KO starts with Sunday (일)', () => {
      expect(DAY_NAMES_KO[0]).toBe('일');
    });

    it('DAY_NAMES_EN ends with Saturday', () => {
      expect(DAY_NAMES_EN[6]).toBe('Sat');
    });

    it('DAY_NAMES_KO ends with Saturday (토)', () => {
      expect(DAY_NAMES_KO[6]).toBe('토');
    });
  });

  // =============================================================================
  // Edge Cases and Integration
  // =============================================================================

  describe('edge cases', () => {
    it('handles leap year correctly in getWeekDays', () => {
      const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
      const days = getWeekDays(date);

      expect(days).toHaveLength(7);
      expect(days.some((d) => d.getDate() === 29 && d.getMonth() === 1)).toBe(true);
    });

    it('handles year boundaries in getWeekDays', () => {
      const date = new Date(2024, 0, 1); // January 1, 2024 (Monday)
      const days = getWeekDays(date);

      expect(days[0].getFullYear()).toBe(2023); // Previous year's Sunday
      expect(days[6].getFullYear()).toBe(2024); // Current year's Saturday
    });

    it('handles all meal types in getMealTypeEmoji', () => {
      const types = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink', 'other'];
      types.forEach((type) => {
        const emoji = getMealTypeEmoji(type);
        expect(emoji).toBeTruthy();
        expect(typeof emoji).toBe('string');
      });
    });

    it('handles all meal types in getMealTypeLabel', () => {
      const types = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink', 'other'];
      types.forEach((type) => {
        const label = getMealTypeLabel(type);
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
      });
    });
  });
});

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' },
}));

const mockLogout = jest.fn();
const mockUser = { id: '1', email: 'test@example.com', name: 'Test', photo: null, provider: 'google' as const };

jest.mock('@/features/auth', () => ({
  useAuthStore: () => ({
    user: mockUser,
    logout: mockLogout,
    isLoading: false,
  }),
}));

const mockUpdateDisplay = jest.fn();
const mockUpdateNotifications = jest.fn();

jest.mock('../settingsStore', () => ({
  useSettingsStore: () => ({
    display: { theme: 'dark', language: 'en' },
    notifications: { enabled: true },
    updateDisplay: mockUpdateDisplay,
    updateNotifications: mockUpdateNotifications,
    isLoading: false,
  }),
}));

jest.mock('../useSettingsQueries', () => ({
  useDeleteAccountMutation: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock('@/shared/lib/i18n', () => ({
  useSettingsI18n: () => ({
    display: {
      theme: {
        light: 'Light',
        lightDesc: 'Light mode',
        dark: 'Dark',
        darkDesc: 'Dark mode',
        system: 'System',
        systemDesc: 'Follow system',
      },
    },
  }),
  changeLanguage: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useSettingsScreen } from '../useSettingsScreen';
import { changeLanguage } from '@/shared/lib/i18n';

describe('useSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDisplay.mockResolvedValue(undefined);
    mockUpdateNotifications.mockResolvedValue(undefined);
  });

  it('returns user and isAuthenticated=true when user exists', () => {
    const { result } = renderHook(() => useSettingsScreen());
    expect(result.current.user).toBe(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('provides theme options', () => {
    const { result } = renderHook(() => useSettingsScreen());
    expect(result.current.themeOptions).toHaveLength(3);
    expect(result.current.themeOptions[0].value).toBe('light');
    expect(result.current.themeOptions[1].value).toBe('dark');
    expect(result.current.themeOptions[2].value).toBe('system');
  });

  it('provides language options', () => {
    const { result } = renderHook(() => useSettingsScreen());
    expect(result.current.languageOptions).toHaveLength(2);
    expect(result.current.languageOptions[0].value).toBe('en');
    expect(result.current.languageOptions[1].value).toBe('ko');
  });

  it('getDisplayValue returns label for current theme', () => {
    const { result } = renderHook(() => useSettingsScreen());
    expect(result.current.getDisplayValue('theme')).toBe('Dark');
  });

  it('getDisplayValue returns label for current language', () => {
    const { result } = renderHook(() => useSettingsScreen());
    expect(result.current.getDisplayValue('language')).toBe('English');
  });

  it('handleSelectionChange updates theme', async () => {
    const { result } = renderHook(() => useSettingsScreen());

    await act(async () => {
      await result.current.handleSelectionChange('light', 'theme');
    });

    expect(mockUpdateDisplay).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('handleSelectionChange updates language and calls changeLanguage', async () => {
    const { result } = renderHook(() => useSettingsScreen());

    await act(async () => {
      await result.current.handleSelectionChange('ko', 'language');
    });

    expect(mockUpdateDisplay).toHaveBeenCalledWith({ language: 'ko' });
    expect(changeLanguage).toHaveBeenCalledWith('ko');
  });

  it('updateNotifications calls store method', async () => {
    const { result } = renderHook(() => useSettingsScreen());

    await act(async () => {
      await result.current.updateNotifications({ enabled: false });
    });

    expect(mockUpdateNotifications).toHaveBeenCalledWith({ enabled: false });
  });
});

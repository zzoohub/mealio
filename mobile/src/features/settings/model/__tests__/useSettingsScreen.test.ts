jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' },
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockToast = jest.fn();
jest.mock('@/app/providers/overlay', () => ({
  useOverlayHelpers: () => ({ toast: mockToast }),
}));

const mockClearQueue = jest.fn();
jest.mock('@/entities/entry', () => ({
  useUploadQueueStore: Object.assign(jest.fn(), {
    getState: () => ({ clearQueue: mockClearQueue }),
  }),
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

const mockMutateAsync = jest.fn();
jest.mock('../useSettingsQueries', () => ({
  useDeleteAccountMutation: () => ({
    mutateAsync: mockMutateAsync,
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
import { Alert } from 'react-native';
import { useSettingsScreen } from '../useSettingsScreen';
import { changeLanguage } from '@/shared/lib/i18n';

describe('useSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDisplay.mockResolvedValue(undefined);
    mockUpdateNotifications.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
    mockMutateAsync.mockResolvedValue(undefined);
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

  describe('handleLogout', () => {
    it('shows confirmation alert with Sign Out title', () => {
      const { result } = renderHook(() => useSettingsScreen());

      act(() => {
        result.current.handleLogout();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Sign Out',
        'Are you sure you want to sign out?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Sign Out', style: 'destructive' }),
        ])
      );
    });

    it('calls logout when Sign Out button is pressed', async () => {
      const { result } = renderHook(() => useSettingsScreen());

      act(() => {
        result.current.handleLogout();
      });

      // Extract and invoke the Sign Out onPress handler
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const signOutButton = alertCall[2].find((b: { text: string }) => b.text === 'Sign Out');

      await act(async () => {
        await signOutButton.onPress();
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('shows error alert when logout throws', async () => {
      mockLogout.mockRejectedValueOnce(new Error('network error'));
      const { result } = renderHook(() => useSettingsScreen());

      act(() => {
        result.current.handleLogout();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const signOutButton = alertCall[2].find((b: { text: string }) => b.text === 'Sign Out');

      await act(async () => {
        await signOutButton.onPress();
      });

      // Second Alert.alert call is the error
      expect(Alert.alert).toHaveBeenCalledTimes(2);
      expect((Alert.alert as jest.Mock).mock.calls[1][0]).toBe('Error');
      expect((Alert.alert as jest.Mock).mock.calls[1][1]).toBe('Failed to sign out. Please try again.');
    });
  });

  describe('handleDeleteAccount', () => {
    it('shows confirmation alert with Delete Account title', () => {
      const { result } = renderHook(() => useSettingsScreen());

      act(() => {
        result.current.handleDeleteAccount();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Account',
        expect.stringContaining('permanently delete'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete Account', style: 'destructive' }),
        ])
      );
    });

    it('calls mutateAsync, clearQueue, logout, replace, and toast on confirm', async () => {
      const { result } = renderHook(() => useSettingsScreen());

      act(() => {
        result.current.handleDeleteAccount();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((b: { text: string }) => b.text === 'Delete Account');

      await act(async () => {
        await deleteButton.onPress();
      });

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockClearQueue).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/');
      expect(mockToast).toHaveBeenCalledWith({ title: 'Account deleted', type: 'success' });
    });

    it('clears queue before logout on successful deletion', async () => {
      const callOrder: string[] = [];
      mockClearQueue.mockImplementation(() => callOrder.push('clearQueue'));
      mockLogout.mockImplementation(async () => callOrder.push('logout'));

      const { result } = renderHook(() => useSettingsScreen());

      act(() => {
        result.current.handleDeleteAccount();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((b: { text: string }) => b.text === 'Delete Account');

      await act(async () => {
        await deleteButton.onPress();
      });

      expect(callOrder.indexOf('clearQueue')).toBeLessThan(callOrder.indexOf('logout'));
    });

    it('shows error alert when deletion throws', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('server error'));
      const { result } = renderHook(() => useSettingsScreen());

      act(() => {
        result.current.handleDeleteAccount();
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((b: { text: string }) => b.text === 'Delete Account');

      await act(async () => {
        await deleteButton.onPress();
      });

      // clearQueue is called before the mutation (to prevent race conditions), so it runs even on failure
      expect(mockClearQueue).toHaveBeenCalled();
      // logout, replace, toast should NOT be called on failure
      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalled();

      expect(Alert.alert).toHaveBeenCalledTimes(2);
      expect((Alert.alert as jest.Mock).mock.calls[1][0]).toBe('Error');
      expect((Alert.alert as jest.Mock).mock.calls[1][1]).toBe('Failed to delete account. Please try again.');
    });
  });
});

// Mock modules before imports
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '17.0' },
}));
jest.mock('@/shared/config', () => ({
  STORAGE_KEYS: { USER_DATA: 'user_data', AUTH_TOKEN: 'auth_token' },
}));
jest.mock('@/shared/lib/storage', () => ({
  storage: {
    set: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('@/shared/api', () => ({
  apiClient: { post: jest.fn() },
  useTokenStore: {
    getState: jest.fn(() => ({
      setTokens: jest.fn(),
      clearTokens: jest.fn(),
      loadFromStorage: jest.fn(),
      accessToken: null,
      refreshToken: null,
    })),
  },
  mapApiUserInfoToUser: jest.fn(),
}));
jest.mock('@/shared/lib/query', () => ({
  queryClient: { clear: jest.fn() },
}));

import { useAuthStore } from '../authStore';
import { apiClient, useTokenStore, mapApiUserInfoToUser } from '@/shared/api';
import { storage } from '@/shared/lib/storage';
import { queryClient } from '@/shared/lib/query';
import { track, identifyUser, aliasUser, resetUser } from '@/shared/lib/analytics';
import type { AuthCredential } from '@/entities/user';

const mockTrack = track as jest.Mock;
const mockIdentifyUser = identifyUser as jest.Mock;
const mockAliasUser = aliasUser as jest.Mock;
const mockResetUser = resetUser as jest.Mock;

const mockApiPost = apiClient.post as jest.Mock;
const mockMapUser = mapApiUserInfoToUser as jest.Mock;
const mockSetTokens = jest.fn();
const mockClearTokens = jest.fn();
const mockLoadFromStorage = jest.fn();

const mockCredential: AuthCredential = {
  providerId: 'google',
  idToken: 'test-id-token',
  user: { id: '1', email: 'test@example.com', name: 'Test', photo: null },
};

const mockApiResponse = {
  access_token: 'access-token-123',
  refresh_token: 'refresh-token-456',
  expires_in: 3600,
  user: { id: 1, email: 'test@example.com', display_name: 'Test' },
};

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test',
  photo: null,
  provider: 'google' as const,
};

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store to initial state
    useAuthStore.setState({ user: null, isLoading: false, error: null });
    (useTokenStore.getState as jest.Mock).mockReturnValue({
      setTokens: mockSetTokens,
      clearTokens: mockClearTokens,
      loadFromStorage: mockLoadFromStorage,
      accessToken: null,
      refreshToken: null,
    });
  });

  // ===========================================================================
  // login
  // ===========================================================================

  describe('login', () => {
    it('logs in successfully and stores user', async () => {
      mockApiPost.mockResolvedValueOnce(mockApiResponse);
      mockMapUser.mockReturnValueOnce(mockUser);

      await useAuthStore.getState().login(mockCredential);

      expect(mockApiPost).toHaveBeenCalledWith('/auth/sign-in', {
        provider: 'google',
        id_token: 'test-id-token',
        device_info: 'ios/17.0',
      });
      expect(mockSetTokens).toHaveBeenCalledWith('access-token-123', 'refresh-token-456', 3600);
      expect(storage.set).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();

      // Analytics assertions
      expect(mockIdentifyUser).toHaveBeenCalledWith('1', { auth_provider: 'google' });
      expect(mockTrack).toHaveBeenCalledWith('signup_completed', {
        auth_provider: 'google',
        is_new_user: false,
      });
    });

    it('sets loading state during login', async () => {
      let loadingDuringCall = false;
      mockApiPost.mockImplementationOnce(() => {
        loadingDuringCall = useAuthStore.getState().isLoading;
        return Promise.resolve(mockApiResponse);
      });
      mockMapUser.mockReturnValueOnce(mockUser);

      await useAuthStore.getState().login(mockCredential);

      expect(loadingDuringCall).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets error on login failure', async () => {
      mockApiPost.mockRejectedValueOnce(new Error('Network error'));

      await expect(useAuthStore.getState().login(mockCredential)).rejects.toThrow('Network error');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
    });

    it('does not fire guest_converted for fresh first login without guest entries', async () => {
      mockApiPost.mockResolvedValueOnce(mockApiResponse);
      mockMapUser.mockReturnValueOnce(mockUser);

      await useAuthStore.getState().login(mockCredential);

      expect(mockAliasUser).not.toHaveBeenCalled();
      expect(mockTrack).not.toHaveBeenCalledWith('guest_converted', expect.anything());
    });

    it('fires guest_converted when guest entries exist in MMKV', async () => {
      (storage.get as jest.Mock).mockImplementation((key: string) => {
        if (key === '@diary_entries') return [{ id: '1' }, { id: '2' }];
        return undefined;
      });
      mockApiPost.mockResolvedValueOnce(mockApiResponse);
      mockMapUser.mockReturnValueOnce(mockUser);

      await useAuthStore.getState().login(mockCredential);

      expect(mockAliasUser).toHaveBeenCalledWith('1');
      expect(mockTrack).toHaveBeenCalledWith('guest_converted', {
        auth_provider: 'google',
        guest_entry_count: 2,
      });
    });
  });

  // ===========================================================================
  // logout
  // ===========================================================================

  describe('logout', () => {
    it('clears user state and tokens on logout', async () => {
      useAuthStore.setState({ user: mockUser });

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(mockClearTokens).toHaveBeenCalled();
      expect(storage.remove).toHaveBeenCalled();
      expect(queryClient.clear).toHaveBeenCalled();

      // Analytics assertions
      expect(mockTrack).toHaveBeenCalledWith('logout_completed');
      expect(mockResetUser).toHaveBeenCalled();
    });

    it('still logs out locally when revoke fails', async () => {
      (useTokenStore.getState as jest.Mock).mockReturnValue({
        setTokens: mockSetTokens,
        clearTokens: mockClearTokens,
        loadFromStorage: mockLoadFromStorage,
        accessToken: 'token',
        refreshToken: 'refresh',
      });
      mockApiPost.mockRejectedValueOnce(new Error('Revoke failed'));
      useAuthStore.setState({ user: mockUser });

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(mockClearTokens).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // loadUserFromStorage
  // ===========================================================================

  describe('loadUserFromStorage', () => {
    it('restores user when tokens and user data exist', async () => {
      (storage.get as jest.Mock).mockReturnValueOnce(mockUser);
      (useTokenStore.getState as jest.Mock).mockReturnValue({
        setTokens: mockSetTokens,
        clearTokens: mockClearTokens,
        loadFromStorage: mockLoadFromStorage,
        accessToken: 'stored-token',
        refreshToken: null,
      });

      await useAuthStore.getState().loadUserFromStorage();

      expect(mockLoadFromStorage).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('does not restore user when no tokens', async () => {
      (storage.get as jest.Mock).mockReturnValueOnce(mockUser);

      await useAuthStore.getState().loadUserFromStorage();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('does not restore user when no stored user data', async () => {
      (storage.get as jest.Mock).mockReturnValueOnce(null);
      (useTokenStore.getState as jest.Mock).mockReturnValue({
        setTokens: mockSetTokens,
        clearTokens: mockClearTokens,
        loadFromStorage: mockLoadFromStorage,
        accessToken: 'stored-token',
        refreshToken: null,
      });

      await useAuthStore.getState().loadUserFromStorage();

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  // ===========================================================================
  // clearError
  // ===========================================================================

  describe('clearError', () => {
    it('clears the error state', () => {
      useAuthStore.setState({ error: 'some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});

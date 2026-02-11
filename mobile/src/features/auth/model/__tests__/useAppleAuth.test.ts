// Mock modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockIsAvailableAsync = jest.fn();
const mockSignInAsync = jest.fn();

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: mockIsAvailableAsync,
  signInAsync: mockSignInAsync,
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAppleAuth } from '../useAppleAuth';

describe('useAppleAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailableAsync.mockResolvedValue(true);
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useAppleAuth());

    expect(result.current.isSigningIn).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('checks availability on mount (iOS)', async () => {
    renderHook(() => useAppleAuth());

    await waitFor(() => {
      expect(mockIsAvailableAsync).toHaveBeenCalled();
    });
  });

  it('returns credential on successful sign in', async () => {
    mockSignInAsync.mockResolvedValueOnce({
      identityToken: 'apple-id-token-123',
      user: 'apple-user-1',
      email: 'user@icloud.com',
      fullName: {
        givenName: 'Test',
        familyName: 'User',
      },
    });

    const { result } = renderHook(() => useAppleAuth());

    // Wait for availability check
    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    let credential: unknown;
    await act(async () => {
      credential = await result.current.signIn();
    });

    expect(credential).toEqual({
      providerId: 'apple',
      idToken: 'apple-id-token-123',
      user: {
        id: 'apple-user-1',
        email: 'user@icloud.com',
        name: 'Test User',
        photo: null,
      },
    });
  });

  it('returns null when user cancels', async () => {
    mockSignInAsync.mockRejectedValueOnce({ code: 'ERR_REQUEST_CANCELED' });

    const { result } = renderHook(() => useAppleAuth());

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    let credential: unknown;
    await act(async () => {
      credential = await result.current.signIn();
    });

    expect(credential).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error when sign in fails', async () => {
    mockSignInAsync.mockRejectedValueOnce(new Error('Sign in failed'));

    const { result } = renderHook(() => useAppleAuth());

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.error).toBe('Sign in failed');
  });

  it('returns null when identityToken is missing', async () => {
    mockSignInAsync.mockResolvedValueOnce({
      identityToken: null,
      user: 'apple-user-1',
    });

    const { result } = renderHook(() => useAppleAuth());

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    let credential: unknown;
    await act(async () => {
      credential = await result.current.signIn();
    });

    expect(credential).toBeNull();
    expect(result.current.error).toBe('Failed to get identity token from Apple');
  });

  it('clearError resets error state', async () => {
    mockSignInAsync.mockRejectedValueOnce(new Error('Some error'));

    const { result } = renderHook(() => useAppleAuth());

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    await act(async () => {
      await result.current.signIn();
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

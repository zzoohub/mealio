// Mock modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockConfigure = jest.fn();
const mockHasPlayServices = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockIsSuccessResponse = jest.fn();
const mockIsErrorWithCode = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: mockConfigure,
    hasPlayServices: mockHasPlayServices,
    signIn: mockSignIn,
    signOut: mockSignOut,
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isSuccessResponse: mockIsSuccessResponse,
  isErrorWithCode: mockIsErrorWithCode,
}));

import { renderHook, act } from '@testing-library/react-native';
import { useGoogleAuth } from '../useGoogleAuth';

describe('useGoogleAuth', () => {
  beforeEach(() => {
    mockHasPlayServices.mockResolvedValue(true);
    // Restore implementations cleared by resetMocks: true
    mockIsSuccessResponse.mockImplementation((response: { type: string }) => response.type === 'success');
    mockIsErrorWithCode.mockImplementation((err: { code?: string }) => !!err.code);
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useGoogleAuth());

    expect(result.current.isSigningIn).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns credential on successful sign in', async () => {
    mockSignIn.mockResolvedValueOnce({
      type: 'success',
      data: {
        idToken: 'google-id-token-123',
        user: {
          id: 'google-user-1',
          email: 'user@gmail.com',
          name: 'Test User',
          photo: 'https://photo.url',
        },
      },
    });

    const { result } = renderHook(() => useGoogleAuth());

    let credential: unknown;
    await act(async () => {
      credential = await result.current.signIn();
    });

    expect(credential).toEqual({
      providerId: 'google',
      idToken: 'google-id-token-123',
      user: {
        id: 'google-user-1',
        email: 'user@gmail.com',
        name: 'Test User',
        photo: 'https://photo.url',
      },
    });
    expect(result.current.isSigningIn).toBe(false);
  });

  it('returns null on sign-in cancellation', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'SIGN_IN_CANCELLED' });

    const { result } = renderHook(() => useGoogleAuth());

    let credential: unknown;
    await act(async () => {
      credential = await result.current.signIn();
    });

    expect(credential).toBeNull();
    // Cancellation should not set error
    expect(result.current.error).toBeNull();
  });

  it('sets error when Play Services unavailable', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'PLAY_SERVICES_NOT_AVAILABLE', message: 'Play Services not available' });

    const { result } = renderHook(() => useGoogleAuth());

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.error).toBe('Google Play Services not available');
  });

  it('clearError resets error state', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Unknown error'));

    const { result } = renderHook(() => useGoogleAuth());

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

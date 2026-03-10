import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { STORAGE_KEYS } from "@/shared/config";
import { storage } from "@/shared/lib/storage";
import { apiClient, useTokenStore, mapApiUserInfoToUser } from "@/shared/api";
import type { ApiAuthResponse } from "@/shared/api";
import type { User, AuthCredential } from "@/entities/user";
import { queryClient } from "@/shared/lib/query";
import { Platform } from "react-native";
import { captureError } from "@/shared/lib/sentry";
import { track, identifyUser, aliasUser, resetUser } from "@/shared/lib/analytics";

// =============================================================================
// TYPES
// =============================================================================

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credential: AuthCredential) => Promise<void>;
  logout: () => Promise<void>;
  loadUserFromStorage: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
};

// =============================================================================
// STORE
// =============================================================================

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    login: async (credential: AuthCredential) => {
      try {
        set({ isLoading: true, error: null });

        // Detect guest-to-auth conversion before login overwrites state
        const wasGuest = !get().user;

        const deviceInfo = `${Platform.OS}/${Platform.Version}`;

        const response = await apiClient.post<ApiAuthResponse>("/auth/sign-in", {
          provider: credential.providerId,
          id_token: credential.idToken,
          device_info: deviceInfo,
        });

        // Store JWT tokens
        useTokenStore.getState().setTokens(
          response.access_token,
          response.refresh_token,
          response.expires_in,
        );

        // Map API user to mobile User type
        const user = mapApiUserInfoToUser(response.user, credential.providerId);

        // Persist user data for offline hydration
        storage.set(STORAGE_KEYS.USER_DATA, user);

        set({ user, isLoading: false, error: null });

        // Analytics: identify + track signup
        identifyUser(String(response.user.id), {
          auth_provider: credential.providerId,
        });

        track("signup_completed", {
          auth_provider: credential.providerId,
          is_new_user: response.is_new_user ?? false,
        });

        // Analytics: guest conversion
        if (wasGuest) {
          aliasUser(String(response.user.id));
          track("guest_converted", {
            auth_provider: credential.providerId,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Login failed";
        set({ error: message, isLoading: false });
        captureError(error, { tags: { auth_action: "login" } });
        throw error;
      }
    },

    logout: async () => {
      try {
        set({ isLoading: true, error: null });

        // Best-effort token revocation
        const { refreshToken } = useTokenStore.getState();
        if (refreshToken) {
          try {
            await apiClient.post("/auth/revoke", { refresh_token: refreshToken });
          } catch {
            // Ignore revocation errors — still log out locally
          }
        }

        // Clear tokens
        useTokenStore.getState().clearTokens();

        // Clear persisted user data
        storage.remove(STORAGE_KEYS.USER_DATA);
        storage.remove(STORAGE_KEYS.AUTH_TOKEN);

        // Clear all cached queries
        queryClient.clear();

        track("logout_completed");
        resetUser();

        set({ ...initialState });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Logout failed";
        set({ error: message, isLoading: false });
        captureError(error, { tags: { auth_action: "logout" } });
      }
    },

    loadUserFromStorage: async () => {
      try {
        set({ isLoading: true, error: null });

        // Hydrate tokens from SecureStore
        await useTokenStore.getState().loadFromStorage();

        const userData = storage.get<User>(STORAGE_KEYS.USER_DATA);
        const hasTokens = !!useTokenStore.getState().accessToken;

        if (userData && hasTokens) {
          set({ user: userData, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      } catch (error) {
        captureError(error, { tags: { auth_action: "load_user" } });
        set({ isLoading: false });
      }
    },

    clearError: () => set({ error: null }),
  }))
);

// =============================================================================
// SELECTORS
// =============================================================================

export const selectIsAuthenticated = (state: AuthStore) => !!state.user;
export const selectUser = (state: AuthStore) => state.user;

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { STORAGE_KEYS } from "@/shared/config";
import { storage } from "@/shared/lib/storage";
import type { User, AuthCredential } from "@/entities/user";

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
  subscribeWithSelector((set) => ({
    ...initialState,

    login: async (credential: AuthCredential) => {
      try {
        set({ isLoading: true, error: null });

        // TODO: Replace with actual backend API call
        // In production:
        // 1. Send credential.idToken to your backend
        // 2. Backend verifies token with the provider
        // 3. Backend returns your own auth token + user data
        await new Promise((resolve) => setTimeout(resolve, 500));

        const user: User = {
          id: `${credential.providerId}_${credential.user.id}`,
          email: credential.user.email,
          name: credential.user.name,
          photo: credential.user.photo,
          provider: credential.providerId,
        };

        // Save to storage
        await Promise.all([
          storage.set(STORAGE_KEYS.USER_DATA, user),
          storage.set(STORAGE_KEYS.AUTH_TOKEN, credential.idToken),
        ]);

        set({ user, isLoading: false, error: null });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Login failed";
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      try {
        set({ isLoading: true, error: null });

        await storage.removeMultiple([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.AUTH_TOKEN,
        ]);

        set({ ...initialState });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Logout failed";
        set({ error: message, isLoading: false });
      }
    },

    loadUserFromStorage: async () => {
      try {
        set({ isLoading: true, error: null });

        const [userData, authToken] = storage.getMultiple([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.AUTH_TOKEN,
        ]);

        if (userData?.value && authToken?.value) {
          set({ user: userData.value as User, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      } catch (error) {
        console.error("Failed to load user from storage:", error);
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

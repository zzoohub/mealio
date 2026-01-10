import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { STORAGE_KEYS } from "@/constants";
import { storage } from "@/lib/storage";
import type { User, GoogleUser } from "../types";

// =============================================================================
// TYPES
// =============================================================================

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  loginWithGoogle: (googleUser: GoogleUser) => Promise<void>;
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

    loginWithGoogle: async (googleUser: GoogleUser) => {
      try {
        set({ isLoading: true, error: null });

        // TODO: Replace with actual backend API call
        // In production:
        // 1. Send googleUser.idToken to your backend
        // 2. Backend verifies token with Google
        // 3. Backend returns your own auth token + user data
        await new Promise((resolve) => setTimeout(resolve, 500));

        const user: User = {
          id: `google_${googleUser.id}`,
          email: googleUser.email,
          name: googleUser.name,
          photo: googleUser.photo,
        };

        // Save to storage
        await Promise.all([
          storage.set(STORAGE_KEYS.USER_DATA, user),
          storage.set(STORAGE_KEYS.GOOGLE_AUTH_TOKEN, googleUser.idToken),
        ]);

        set({ user, isLoading: false, error: null });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Google login failed";
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      try {
        set({ isLoading: true, error: null });

        await storage.removeMultiple([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.GOOGLE_AUTH_TOKEN,
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
          STORAGE_KEYS.GOOGLE_AUTH_TOKEN,
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

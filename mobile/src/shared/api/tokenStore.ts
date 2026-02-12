import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "@/shared/config";
import { storage } from "@/shared/lib/storage";

// =============================================================================
// TYPES
// =============================================================================

interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

interface TokenActions {
  setTokens: (access: string, refresh: string, expiresIn: number) => void;
  clearTokens: () => void;
  isExpired: () => boolean;
  loadFromStorage: () => Promise<void>;
}

type TokenStore = TokenState & TokenActions;

// =============================================================================
// CONSTANTS
// =============================================================================

/** Refresh 30s before actual expiry to avoid race conditions */
const EXPIRY_BUFFER_MS = 30_000;

const SECURE_KEY_ACCESS = "mealio_access_token";
const SECURE_KEY_REFRESH = "mealio_refresh_token";

// =============================================================================
// STORE
// =============================================================================

export const useTokenStore = create<TokenStore>()((set, get) => ({
  accessToken: null,
  refreshToken: null,
  expiresAt: null,

  setTokens: (access: string, refresh: string, expiresIn: number) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    set({ accessToken: access, refreshToken: refresh, expiresAt });

    // Sensitive tokens go to SecureStore (encrypted keychain/keystore)
    SecureStore.setItemAsync(SECURE_KEY_ACCESS, access).catch(() => {});
    SecureStore.setItemAsync(SECURE_KEY_REFRESH, refresh).catch(() => {});
    // Non-sensitive expiry timestamp stays in MMKV for sync access
    storage.set(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt);
  },

  clearTokens: () => {
    set({ accessToken: null, refreshToken: null, expiresAt: null });

    SecureStore.deleteItemAsync(SECURE_KEY_ACCESS).catch(() => {});
    SecureStore.deleteItemAsync(SECURE_KEY_REFRESH).catch(() => {});
    storage.remove(STORAGE_KEYS.TOKEN_EXPIRES_AT);
  },

  isExpired: () => {
    const { expiresAt } = get();
    if (!expiresAt) return true;
    return Date.now() >= expiresAt - EXPIRY_BUFFER_MS;
  },

  loadFromStorage: async () => {
    const expiresAt = storage.get<number>(STORAGE_KEYS.TOKEN_EXPIRES_AT);

    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEY_ACCESS),
        SecureStore.getItemAsync(SECURE_KEY_REFRESH),
      ]);
      if (accessToken && refreshToken) {
        set({ accessToken, refreshToken, expiresAt });
      }
    } catch {
      // SecureStore read failed — stay logged out
    }
  },
}));

import { create } from "zustand";
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
  loadFromStorage: () => void;
}

type TokenStore = TokenState & TokenActions;

// =============================================================================
// CONSTANTS
// =============================================================================

/** Refresh 30s before actual expiry to avoid race conditions */
const EXPIRY_BUFFER_MS = 30_000;

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

    storage.set(STORAGE_KEYS.ACCESS_TOKEN, access);
    storage.set(STORAGE_KEYS.REFRESH_TOKEN, refresh);
    storage.set(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt);
  },

  clearTokens: () => {
    set({ accessToken: null, refreshToken: null, expiresAt: null });

    storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    storage.remove(STORAGE_KEYS.TOKEN_EXPIRES_AT);
  },

  isExpired: () => {
    const { expiresAt } = get();
    if (!expiresAt) return true;
    return Date.now() >= expiresAt - EXPIRY_BUFFER_MS;
  },

  loadFromStorage: () => {
    const accessToken = storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = storage.get<string>(STORAGE_KEYS.REFRESH_TOKEN);
    const expiresAt = storage.get<number>(STORAGE_KEYS.TOKEN_EXPIRES_AT);

    if (accessToken && refreshToken) {
      set({ accessToken, refreshToken, expiresAt });
    }
  },
}));

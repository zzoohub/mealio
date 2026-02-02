import { useTokenStore } from "@/shared/api/tokenStore";

/**
 * Check if user is currently authenticated.
 * Safe to call from any FSD layer (shared).
 * Uses token presence as the source of truth.
 */
export function isAuthenticated(): boolean {
  return !!useTokenStore.getState().accessToken;
}

/**
 * React hook to subscribe to authentication state.
 * Returns true when tokens are present in the store.
 */
export function useIsAuthenticated(): boolean {
  return useTokenStore((state) => !!state.accessToken);
}

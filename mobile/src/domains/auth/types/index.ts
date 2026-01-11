/**
 * Auth Domain Types
 *
 * Provider-agnostic types for OAuth authentication.
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type AuthProvider = "google" | "apple";

export interface User {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
  provider: AuthProvider;
}

/**
 * Unified credential format returned by all auth provider hooks.
 * The store's login method accepts this format regardless of provider.
 */
export interface AuthCredential {
  providerId: AuthProvider;
  idToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    photo: string | null;
  };
}

// =============================================================================
// PROVIDER-SPECIFIC TYPES (Internal use only)
// =============================================================================

export interface GoogleUser {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
  familyName: string | null;
  givenName: string | null;
  idToken: string | null;
}

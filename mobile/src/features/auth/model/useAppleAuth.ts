import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import type { AuthCredential } from "@/entities/user";

// =============================================================================
// TYPES
// =============================================================================

interface UseAppleAuthReturn {
  signIn: () => Promise<AuthCredential | null>;
  signOut: () => Promise<void>;
  isSigningIn: boolean;
  error: string | null;
  clearError: () => void;
  isAvailable: boolean;
}

// =============================================================================
// DYNAMIC IMPORTS
// =============================================================================

let AppleAuthentication: typeof import("expo-apple-authentication") | null = null;

const loadAppleAuth = async () => {
  if (Platform.OS !== "ios") {
    return false;
  }

  try {
    AppleAuthentication = await import("expo-apple-authentication");
    return true;
  } catch (error) {
    console.warn("Apple Authentication module not available:", error);
    return false;
  }
};

// =============================================================================
// HOOK
// =============================================================================

export function useAppleAuth(): UseAppleAuthReturn {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    loadAppleAuth().then(async (loaded) => {
      if (loaded && AppleAuthentication) {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAvailable(available);
      }
    });
  }, []);

  const signIn = useCallback(async (): Promise<AuthCredential | null> => {
    if (!AppleAuthentication || !isAvailable) {
      setError("Apple Sign-In is not available");
      return null;
    }

    try {
      setIsSigningIn(true);
      setError(null);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setError("Failed to get identity token from Apple");
        return null;
      }

      // Apple only provides name/email on first sign-in
      // Subsequent sign-ins return null for these fields
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(" ") || null
        : null;

      return {
        providerId: "apple",
        idToken: credential.identityToken,
        user: {
          id: credential.user,
          email: credential.email || "",
          name: fullName,
          photo: null, // Apple doesn't provide profile photos
        },
      };
    } catch (err: unknown) {
      // Check if user cancelled (using error code as per Expo docs)
      if (err && typeof err === "object" && "code" in err) {
        if (err.code === "ERR_REQUEST_CANCELED") {
          // User cancelled - not an error
          return null;
        }
      }
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
      return null;
    } finally {
      setIsSigningIn(false);
    }
  }, [isAvailable]);

  const signOut = useCallback(async () => {
    // Apple doesn't have a sign-out API
    // The app should clear local auth state instead
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signIn,
    signOut,
    isSigningIn,
    error,
    clearError,
    isAvailable,
  };
}

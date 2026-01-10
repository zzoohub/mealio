import { useCallback, useEffect, useState } from "react";
import type { GoogleUser } from "../types";

// =============================================================================
// TYPES
// =============================================================================

interface UseGoogleAuthReturn {
  signIn: () => Promise<GoogleUser | null>;
  signOut: () => Promise<void>;
  isSigningIn: boolean;
  error: string | null;
  clearError: () => void;
  isAvailable: boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let GoogleSignin: typeof import("@react-native-google-signin/google-signin").GoogleSignin | null = null;
let statusCodes: typeof import("@react-native-google-signin/google-signin").statusCodes | null = null;
let isSuccessResponse: typeof import("@react-native-google-signin/google-signin").isSuccessResponse | null = null;
let isErrorWithCode: typeof import("@react-native-google-signin/google-signin").isErrorWithCode | null = null;
let isConfigured = false;

// Dynamically import to handle cases where native module is not available
const loadGoogleSignIn = async () => {
  try {
    const module = await import("@react-native-google-signin/google-signin");
    GoogleSignin = module.GoogleSignin;
    statusCodes = module.statusCodes;
    isSuccessResponse = module.isSuccessResponse;
    isErrorWithCode = module.isErrorWithCode;
    return true;
  } catch (error) {
    console.warn("Google Sign-In module not available:", error);
    return false;
  }
};

export const configureGoogleSignIn = async () => {
  if (isConfigured || !GoogleSignin) return;

  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    offlineAccess: true,
    scopes: ["profile", "email"],
  });

  isConfigured = true;
};

// =============================================================================
// HOOK
// =============================================================================

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    loadGoogleSignIn().then(async loaded => {
      setIsAvailable(loaded);
      if (loaded) {
        await configureGoogleSignIn();
      }
    });
  }, []);

  const signIn = useCallback(async (): Promise<GoogleUser | null> => {
    if (!GoogleSignin || !isSuccessResponse || !isErrorWithCode || !statusCodes) {
      setError("Google Sign-In is not available");
      return null;
    }

    try {
      setIsSigningIn(true);
      setError(null);

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const { data } = response;
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          photo: data.user.photo,
          familyName: data.user.familyName,
          givenName: data.user.givenName,
          idToken: data.idToken,
        };
      }

      return null;
    } catch (err) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.IN_PROGRESS:
            setError("Sign in is already in progress");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError("Google Play Services not available");
            break;
          case statusCodes.SIGN_IN_CANCELLED:
            // User cancelled - not an error
            break;
          default:
            setError(err.message || "Google sign in failed");
        }
      } else {
        setError("An unexpected error occurred");
      }
      return null;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!GoogleSignin) return;

    try {
      await GoogleSignin.signOut();
    } catch (err) {
      console.error("Google sign out error:", err);
    }
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

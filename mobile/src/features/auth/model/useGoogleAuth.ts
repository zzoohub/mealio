import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import type { AuthCredential } from "@/entities/user";
import { captureError } from "@/shared/lib/sentry";
import { track } from "@/shared/lib/analytics";

// =============================================================================
// TYPES
// =============================================================================

interface UseGoogleAuthReturn {
  signIn: () => Promise<AuthCredential | null>;
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

  const signIn = useCallback(async (): Promise<AuthCredential | null> => {
    if (!GoogleSignin || !isSuccessResponse || !isErrorWithCode || !statusCodes) {
      setError("Google Sign-In is not available");
      return null;
    }

    try {
      setIsSigningIn(true);
      setError(null);

      track("auth_started", { auth_provider: "google" });

      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const { data } = response;
        const idToken = data.idToken;
        if (!idToken) {
          setError("Failed to get ID token from Google");
          return null;
        }
        return {
          providerId: "google",
          idToken,
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            photo: data.user.photo,
          },
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
            captureError(err, { tags: { auth_provider: "google", error_code: err.code } });
            track("auth_failed", { auth_provider: "google", error_code: err.code });
            break;
          case statusCodes.SIGN_IN_CANCELLED:
            // User cancelled - not an error, not tracked
            break;
          default:
            setError(err.message || `Google sign in failed (code: ${err.code})`);
            captureError(err, { tags: { auth_provider: "google", error_code: err.code } });
            track("auth_failed", { auth_provider: "google", error_code: err.code });
        }
      } else {
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
        captureError(err, { tags: { auth_provider: "google" } });
        track("auth_failed", { auth_provider: "google", error_message: message });
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
      captureError(err, { tags: { auth_provider: "google", auth_action: "sign_out" } });
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

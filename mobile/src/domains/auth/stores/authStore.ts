import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { STORAGE_KEYS, ERROR_MESSAGES } from "@/constants";
import type { User, PhoneAuthFormData, VerificationFormData } from "../types";
import type { UserPreferences } from "@/domains/settings/types";
import { networkUtils } from "../hooks/useNetworkConnection";
import { storage } from "@/lib/storage";

interface AuthState {
  // User data
  user: User | null;
  preferences: UserPreferences;

  // Auth flow state
  isLoading: boolean;
  isVerifying: boolean;
  error: string | null;
  pendingPhone: string | null;
  resendCooldown: number;
}

interface AuthActions {
  // Phone auth actions
  sendVerificationCode: (data: PhoneAuthFormData) => Promise<void>;
  verifyCode: (data: VerificationFormData) => Promise<void>;
  resendCode: () => Promise<void>;

  // User management
  setUser: (user: Partial<User>) => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  login: (user: Pick<User, "id" | "username" | "phone">) => Promise<void>;
  logout: () => Promise<void>;
  loadUserFromStorage: () => Promise<void>;

  // Preferences
  setPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;

  // Utility
  clearError: () => void;
  clearPendingAuth: () => void;
  startResendCooldown: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialUser: User = {
  id: "",
  username: "",
  phone: "",
  isLoggedIn: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const initialPreferences: UserPreferences = {
  language: "en",
  theme: "system",
  notifications: {
    posts: true,
    likes: true,
    follows: true,
  },
  privacy: {
    showLocation: false,
    allowAnalytics: true,
  },
};

const initialState: AuthState = {
  user: null,
  preferences: initialPreferences,
  isLoading: false,
  isVerifying: false,
  error: null,
  pendingPhone: null,
  resendCooldown: 0,
};

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    sendVerificationCode: async (data: PhoneAuthFormData) => {
      try {
        set({ isLoading: true, error: null });

        // Check network connectivity
        if (!networkUtils.getIsConnected()) {
          throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        }

        // Format the phone number for international format
        const formatInternationalPhone = (countryCode: string, phoneNumber: string) => {
          // Remove all non-digits
          const digits = phoneNumber.replace(/\D/g, "");

          // For certain countries, remove leading 0 when converting to international format
          if (countryCode === "+82" || countryCode === "+81" || countryCode === "+33" || countryCode === "+49") {
            // Remove leading 0 for Korea, Japan, France, Germany
            const cleanDigits = digits.replace(/^0+/, "");
            return `${countryCode}${cleanDigits}`;
          }

          // For other countries (like US), keep the digits as is
          return `${countryCode}${digits}`;
        };

        const formattedPhone = formatInternationalPhone(data.countryCode, data.phone);

        // Use retry logic for network requests
        await networkUtils.retryWithBackoff(async () => {
          // TODO: Replace with actual API call
          // Simulate API call for development
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Simulate potential network failure in development
          if (Math.random() < 0.1) {
            // 10% chance of simulated failure
            throw new Error("Simulated network failure");
          }
        });

        // For now, we'll simulate a successful SMS send
        console.log(`[DEV] SMS sent to ${formattedPhone}`);

        // Store the phone number for verification
        await storage.set(STORAGE_KEYS.LAST_PHONE_NUMBER, formattedPhone);

        set({
          pendingPhone: formattedPhone,
          isLoading: false,
        });

        // Start cooldown timer
        get().startResendCooldown();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SMS_SEND_FAILED;
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    verifyCode: async (data: VerificationFormData) => {
      try {
        const { pendingPhone } = get();
        if (!pendingPhone) {
          throw new Error("No phone number pending verification");
        }

        set({ isVerifying: true, error: null });

        // Check network connectivity
        if (!networkUtils.getIsConnected()) {
          throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        }

        // Use retry logic for network requests
        const verificationResult = await networkUtils.retryWithBackoff(async () => {
          // TODO: Replace with actual API call
          // Simulate API verification
          await new Promise(resolve => setTimeout(resolve, 1500));

          // For development, we'll accept any 6-digit code
          if (data.code.length !== 6) {
            throw new Error(ERROR_MESSAGES.INVALID_VERIFICATION_CODE);
          }

          // Simulate potential verification failures
          if (data.code === "000000") {
            throw new Error(ERROR_MESSAGES.SMS_VERIFICATION_FAILED);
          }

          return {
            success: true,
            user: {
              id: `user_${Date.now()}`, // In real app, this comes from backend
              username: `user_${pendingPhone.slice(-4)}`,
              phone: pendingPhone,
            },
            token: `token_${Date.now()}`, // In real app, this comes from backend
          };
        });

        // Create user object
        const user: User = {
          ...verificationResult.user,
          isLoggedIn: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save auth token and user data
        await Promise.all([
          storage.set(STORAGE_KEYS.PHONE_AUTH_TOKEN, verificationResult.token),
          storage.set(STORAGE_KEYS.USER_DATA, user),
        ]);

        set({
          user,
          isVerifying: false,
          pendingPhone: null,
          error: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SMS_VERIFICATION_FAILED;
        set({ error: errorMessage, isVerifying: false });
        throw error;
      }
    },

    resendCode: async () => {
      try {
        const { pendingPhone, resendCooldown } = get();

        if (!pendingPhone) {
          throw new Error("No phone number to resend to");
        }

        if (resendCooldown > 0) {
          throw new Error(`Please wait ${resendCooldown} seconds before resending`);
        }

        set({ isLoading: true, error: null });

        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log(`[DEV] SMS resent to ${pendingPhone}`);

        set({ isLoading: false });
        get().startResendCooldown();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SMS_SEND_FAILED;
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    setUser: (userData: Partial<User>) => {
      set(state => ({
        user: state.user ? { ...state.user, ...userData } : { ...initialUser, ...userData },
        error: null,
      }));
    },

    login: async (userData: Pick<User, "id" | "username" | "phone">) => {
      try {
        set({ isLoading: true, error: null });

        const user: User = {
          ...userData,
          isLoggedIn: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save to storage
        await storage.set(STORAGE_KEYS.USER_DATA, user);

        set({ user, isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Login failed";
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    updateUser: async (updates: Partial<User>) => {
      try {
        set({ isLoading: true, error: null });

        const currentUser = get().user;
        if (!currentUser) {
          throw new Error("No user logged in");
        }

        const updatedUser = {
          ...currentUser,
          ...updates,
          updatedAt: new Date(),
        };

        // Save to storage
        await storage.set(STORAGE_KEYS.USER_DATA, updatedUser);

        set({ user: updatedUser, isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update user";
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      try {
        set({ isLoading: true, error: null });

        // Clear all auth-related storage
        await storage.removeMultiple([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.PHONE_AUTH_TOKEN,
          STORAGE_KEYS.USER_TOKEN,
          STORAGE_KEYS.LAST_PHONE_NUMBER,
        ]);

        set({
          ...initialState,
          isLoading: false,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Logout failed";
        set({ error: errorMessage, isLoading: false });
      }
    },

    loadUserFromStorage: async () => {
      try {
        set({ isLoading: true, error: null });

        const storageData = await storage.getMultiple([
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.PHONE_AUTH_TOKEN,
          STORAGE_KEYS.APP_SETTINGS,
        ]);

        const [userDataItem, authTokenItem, preferencesItem] = storageData;

        if (userDataItem?.value && authTokenItem?.value) {
          const user = userDataItem.value as User;
          // Convert date strings back to Date objects
          user.createdAt = new Date(user.createdAt);
          user.updatedAt = new Date(user.updatedAt);
          set({ user });
        }

        // Load preferences
        if (preferencesItem?.value) {
          set({ preferences: preferencesItem.value as UserPreferences });
        }

        set({ isLoading: false });
      } catch (error) {
        console.error("Failed to load user from storage:", error);
        set({ isLoading: false });
      }
    },

    clearError: () => set({ error: null }),

    setPreferences: async (updates: Partial<UserPreferences>) => {
      try {
        const newPreferences = { ...get().preferences, ...updates };

        await storage.set(STORAGE_KEYS.APP_SETTINGS, newPreferences);

        set({ preferences: newPreferences });
      } catch (error) {
        console.error("Failed to save preferences:", error);
        throw error;
      }
    },

    clearPendingAuth: () =>
      set({
        pendingPhone: null,
        error: null,
        resendCooldown: 0,
      }),

    startResendCooldown: () => {
      set({ resendCooldown: 30 });

      const countdown = setInterval(() => {
        const current = get().resendCooldown;
        if (current <= 1) {
          clearInterval(countdown);
          set({ resendCooldown: 0 });
        } else {
          set({ resendCooldown: current - 1 });
        }
      }, 1000);
    },
  })),
);

// Subscribe to user changes to automatically save data
useAuthStore.subscribe(
  state => state.user,
  user => {
    if (user) {
      // Auto-save user data when it changes
      try {
        storage.set(STORAGE_KEYS.USER_DATA, user);
      } catch (error) {
        console.error("Failed to auto-save user data:", error);
      }
    }
  },
);

// Helper selectors for common use cases
export const selectIsAuthenticated = (state: AuthStore) => !!state.user?.isLoggedIn;
export const selectUserId = (state: AuthStore) => state.user?.id;
export const selectUsername = (state: AuthStore) => state.user?.username;

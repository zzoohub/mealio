import { useState, useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useSettingsStore, type DisplaySettings, type NotificationSettings } from "../stores/settingsStore";
import { useAuthStore } from "@/domains/auth/stores/authStore";
import { changeLanguage, useSettingsI18n, type SupportedLanguage } from "@/lib/i18n";
import type { User } from "@/domains/auth/types";

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

type SelectionType = "theme" | "language" | null;

interface SelectionState {
  type: SelectionType;
  visible: boolean;
}

interface SelectionOption {
  value: string;
  label: string;
  description: string;
}

export interface UseSettingsScreenReturn {
  // User state
  user: User | null;
  isAuthenticated: boolean;

  // Settings state
  display: DisplaySettings;
  notifications: NotificationSettings;
  isLoading: boolean;
  authLoading: boolean;

  // Selection modal state
  selection: SelectionState;
  themeOptions: SelectionOption[];
  languageOptions: SelectionOption[];

  // Computed values
  getDisplayValue: (key: "theme" | "language") => string;

  // Actions
  openSelection: (type: SelectionType) => void;
  closeSelection: () => void;
  handleSelectionChange: (value: string) => Promise<void>;
  handleLogout: () => void;
  handleDeleteAccount: () => void;
  updateNotifications: (updates: Partial<NotificationSettings>) => Promise<void>;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useSettingsScreen(): UseSettingsScreenReturn {
  const settings = useSettingsI18n();

  // Stores
  const { user, logout, isLoading: authLoading } = useAuthStore();
  const { display, notifications, updateDisplay, updateNotifications, isLoading } = useSettingsStore();

  // Derived state
  const isAuthenticated = !!user?.isLoggedIn;

  // Selection modal state
  const [selection, setSelection] = useState<SelectionState>({ type: null, visible: false });

  // Options
  const themeOptions = useMemo<SelectionOption[]>(
    () => [
      { value: "light", label: settings.display.theme.light, description: settings.display.theme.lightDesc },
      { value: "dark", label: settings.display.theme.dark, description: settings.display.theme.darkDesc },
      { value: "system", label: settings.display.theme.system, description: settings.display.theme.systemDesc },
    ],
    [settings]
  );

  const languageOptions = useMemo<SelectionOption[]>(
    () => [
      { value: "en", label: "English", description: "English (United States)" },
      { value: "ko", label: "한국어", description: "Korean (South Korea)" },
    ],
    []
  );

  // Get display value for a setting
  const getDisplayValue = useCallback(
    (key: "theme" | "language") => {
      const value = display[key];
      if (key === "theme") {
        return themeOptions.find((opt) => opt.value === value)?.label || value;
      }
      return languageOptions.find((opt) => opt.value === value)?.label || value;
    },
    [display, themeOptions, languageOptions]
  );

  // Selection modal actions
  const openSelection = useCallback((type: SelectionType) => {
    setSelection({ type, visible: true });
  }, []);

  const closeSelection = useCallback(() => {
    setSelection({ type: null, visible: false });
  }, []);

  const handleSelectionChange = useCallback(
    async (value: string) => {
      if (!selection.type) return;

      if (selection.type === "theme") {
        await updateDisplay({ theme: value as "light" | "dark" | "system" });
      } else if (selection.type === "language") {
        await updateDisplay({ language: value as SupportedLanguage });
        await changeLanguage(value as SupportedLanguage);
      }
    },
    [selection.type, updateDisplay]
  );

  // Account actions
  const handleLogout = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  }, [logout]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            // TODO: Implement account deletion
            console.log("Delete account");
          },
        },
      ]
    );
  }, []);

  return {
    // User state
    user,
    isAuthenticated,

    // Settings state
    display,
    notifications,
    isLoading,
    authLoading,

    // Selection modal state
    selection,
    themeOptions,
    languageOptions,

    // Computed values
    getDisplayValue,

    // Actions
    openSelection,
    closeSelection,
    handleSelectionChange,
    handleLogout,
    handleDeleteAccount,
    updateNotifications,
  };
}

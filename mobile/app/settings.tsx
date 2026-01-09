import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useTheme } from "@/lib/theme";
import { Card } from "@/components/ui/Card";
import { SettingsItem, SettingsSection, SelectionModal, SettingsLayout } from "@/domains/settings/components";
import { useSettingsStore } from "@/domains/settings/stores/settingsStore";
import { useAuthStore } from "@/domains/auth/stores/authStore";
import { changeLanguage, useSettingsI18n, type SupportedLanguage } from "@/lib/i18n";

interface SelectionState {
  type: "theme" | "language" | null;
  visible: boolean;
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { user, logout, isLoading: authLoading } = useAuthStore();
  const { display, notifications, updateDisplay, updateNotifications, isLoading } = useSettingsStore();
  const isAuthenticated = !!user?.isLoggedIn;
  const settings = useSettingsI18n();
  const [selection, setSelection] = useState<SelectionState>({ type: null, visible: false });

  const openSelection = (type: SelectionState["type"]) => {
    setSelection({ type, visible: true });
  };

  const closeSelection = () => {
    setSelection({ type: null, visible: false });
  };

  const handleSelectionChange = async (value: string) => {
    if (!selection.type) return;

    if (selection.type === "theme") {
      await updateDisplay({ theme: value as "light" | "dark" | "system" });
    } else if (selection.type === "language") {
      await updateDisplay({ language: value });
      await changeLanguage(value as SupportedLanguage);
    }
  };

  const handleLogout = () => {
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
  };

  const handleDeleteAccount = () => {
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
  };

  const themeOptions = [
    { value: "light", label: settings.display.theme.light, description: settings.display.theme.lightDesc },
    { value: "dark", label: settings.display.theme.dark, description: settings.display.theme.darkDesc },
    { value: "system", label: settings.display.theme.system, description: settings.display.theme.systemDesc },
  ];

  const languageOptions = [
    { value: "en", label: "English", description: "English (United States)" },
    { value: "ko", label: "한국어", description: "Korean (South Korea)" },
  ];

  const getDisplayValue = (key: "theme" | "language") => {
    const value = display[key];
    if (key === "theme") {
      return themeOptions.find((opt) => opt.value === value)?.label || value;
    }
    return languageOptions.find((opt) => opt.value === value)?.label || value;
  };

  const renderUserInfo = () => {
    if (!isAuthenticated) return null;

    return (
      <Card variant="elevated" style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || "U"}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: theme.colors.text }]}>{user?.username || "User"}</Text>
            <Text style={[styles.email, { color: theme.colors.textSecondary }]}>
              {user?.email || user?.phone || "Signed in"}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SettingsLayout title={settings.title}>
      {renderUserInfo()}

      {/* Display Settings */}
      <SettingsSection title={settings.display.title} variant="grouped">
        <SettingsItem
          title={settings.display.theme.title}
          description={settings.display.theme.description}
          icon="color-palette-outline"
          type="select"
          value={getDisplayValue("theme")}
          onPress={() => openSelection("theme")}
          disabled={isLoading}
          variant="grouped"
        />
        <SettingsItem
          title={settings.language.title}
          description={settings.language.description}
          icon="language-outline"
          type="select"
          value={getDisplayValue("language")}
          onPress={() => openSelection("language")}
          disabled={isLoading}
          variant="grouped"
        />
      </SettingsSection>

      {/* Notification Settings */}
      <SettingsSection title={settings.notifications.title} variant="grouped">
        <SettingsItem
          title={settings.notifications.title}
          description={settings.notifications.description}
          icon="notifications-outline"
          type="toggle"
          value={notifications.enabled}
          onValueChange={(value) => updateNotifications({ enabled: value })}
          variant="grouped"
        />
      </SettingsSection>

      {/* Account Settings - only for authenticated users */}
      {isAuthenticated && (
        <SettingsSection title="Account" variant="grouped">
          <SettingsItem
            title="Sign Out"
            description="Sign out of your account"
            icon="log-out-outline"
            type="navigation"
            onPress={handleLogout}
            disabled={authLoading}
            variant="grouped"
          />
          <SettingsItem
            title="Delete Account"
            description="Permanently delete your account"
            icon="trash-outline"
            type="navigation"
            onPress={handleDeleteAccount}
            disabled={authLoading}
            variant="grouped"
          />
        </SettingsSection>
      )}

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appVersion, { color: theme.colors.textSecondary }]}>Version 1.0.0</Text>
      </View>

      <SelectionModal
        visible={selection.visible}
        title={selection.type === "theme" ? "Choose Theme" : settings.display.language.select}
        options={selection.type === "theme" ? themeOptions : languageOptions}
        selectedValue={selection.type === "theme" ? display.theme : display.language}
        onSelect={handleSelectionChange}
        onClose={closeSelection}
      />
    </SettingsLayout>
  );
}

const styles = StyleSheet.create({
  userCard: {
    marginBottom: 24,
    padding: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: 16,
  },
  appVersion: {
    fontSize: 12,
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/design-system/theme";
import { Card } from "@/design-system/styled";
import { SettingsItem, SettingsSection, SelectionModal, SettingsLayout } from "@/domains/settings/components";
import { useSettingsScreen } from "@/domains/settings/hooks/useSettingsScreen";
import { useSettingsI18n } from "@/lib/i18n";
import { tokens } from "@/design-system/tokens";

// =============================================================================
// MAIN COMPONENT (Composition Pattern)
// =============================================================================

export default function SettingsScreen() {
  const { colors } = useTheme();
  const settings = useSettingsI18n();

  const {
    user,
    isAuthenticated,
    display,
    notifications,
    isLoading,
    authLoading,
    selection,
    themeOptions,
    languageOptions,
    getDisplayValue,
    openSelection,
    closeSelection,
    handleSelectionChange,
    handleLogout,
    handleDeleteAccount,
    updateNotifications,
  } = useSettingsScreen();

  return (
    <SettingsLayout title={settings.title}>
      {/* User Info Card */}
      {isAuthenticated && (
        <Card variant="elevated" style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.interactive.primary }]}>
              <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || "U"}</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.username, { color: colors.text.primary }]}>{user?.username || "User"}</Text>
              <Text style={[styles.email, { color: colors.text.secondary }]}>
                {user?.email || user?.phone || "Signed in"}
              </Text>
            </View>
          </View>
        </Card>
      )}

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

      {/* Account Settings */}
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

      {/* App Version */}
      <View style={styles.appInfo}>
        <Text style={[styles.appVersion, { color: colors.text.secondary }]}>Version 1.0.0</Text>
      </View>

      {/* Selection Modal */}
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

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  userCard: {
    marginBottom: tokens.spacing.layout.sm,
    padding: tokens.spacing.component.lg,
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
    marginRight: tokens.spacing.component.lg,
  },
  avatarText: {
    color: "white",
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.xs,
  },
  email: {
    fontSize: tokens.typography.fontSize.bodySmall,
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: tokens.spacing.component.lg,
  },
  appVersion: {
    fontSize: tokens.typography.fontSize.caption,
  },
});

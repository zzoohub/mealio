import React, { useCallback } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, createStyles, useStyles } from "@/shared/ui/theme";
import { Card, Text, HStack, VStack, Toggle } from "@/shared/ui/styled";
import { SelectionModal, SettingsLayout, useSettingsScreen } from "@/features/settings";
import { useSettingsI18n } from "@/shared/lib/i18n";
import { tokens } from "@/shared/ui/tokens";
import { useOverlayHelpers } from "@/app/providers/overlay";

// =============================================================================
// USER PROFILE CARD (Logged In)
// =============================================================================

interface UserProfileCardProps {
  name: string;
  email: string;
}

function UserProfileCard({ name, email }: UserProfileCardProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();
  const initial = name?.charAt(0).toUpperCase() || "U";

  return (
    <View style={[s.profileCard, { borderColor: colors.interactive.primary + "40" }]}>
      <HStack gap="md" align="center" style={s.profileContent}>
        <LinearGradient
          colors={[colors.interactive.primary, colors.interactive.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.profileAvatar}
        >
          <Text variant="body" weight="bold" style={{ color: "#fff" }}>
            {initial}
          </Text>
        </LinearGradient>
        <VStack gap="xs" style={s.profileTextContainer}>
          <Text variant="body" weight="semibold">
            {name || "User"}
          </Text>
          <Text variant="caption" color="secondary">
            {email || "Signed in"}
          </Text>
        </VStack>
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      </HStack>
    </View>
  );
}

// =============================================================================
// SIGN IN CARD (Logged Out)
// =============================================================================

interface SignInCardProps {
  title: string;
  description: string;
  onPress: () => void;
}

function SignInCard({ title, description, onPress }: SignInCardProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View style={[s.profileCard, { borderColor: colors.interactive.primary + "40" }]}>
        <HStack gap="md" align="center" style={s.profileContent}>
          <View style={[s.signInAvatar, { backgroundColor: colors.interactive.primary + "15" }]}>
            <Ionicons name="person-outline" size={22} color={colors.interactive.primary} />
          </View>
          <VStack gap="xs" style={s.profileTextContainer}>
            <Text variant="body" weight="semibold">
              {title}
            </Text>
            <Text variant="caption" color="secondary">
              {description}
            </Text>
          </VStack>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </HStack>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// SETTINGS ROW COMPONENT
// =============================================================================

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  description?: string;
  value?: string;
  type: "select" | "toggle" | "navigation";
  toggleValue?: boolean;
  onPress?: () => void;
  onToggleChange?: (value: boolean) => void;
  disabled?: boolean;
  destructive?: boolean;
  isLast?: boolean;
}

function SettingsRow({
  icon,
  iconColor,
  title,
  description,
  value,
  type,
  toggleValue,
  onPress,
  onToggleChange,
  disabled = false,
  destructive = false,
  isLast = false,
}: SettingsRowProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();

  const resolvedIconColor = iconColor || colors.interactive.primary;
  const textColor = destructive ? colors.status.error : colors.text.primary;

  const content = (
    <View style={[s.rowContainer, !isLast && s.rowBorder]}>
      <HStack gap="md" align="center" style={s.rowContent}>
        <View style={[s.rowIconContainer, { backgroundColor: resolvedIconColor + "15" }]}>
          <Ionicons name={icon} size={20} color={resolvedIconColor} />
        </View>
        <VStack gap="xs" style={s.rowTextContainer}>
          <Text variant="body" weight="medium" style={{ color: textColor, opacity: disabled ? 0.5 : 1 }}>
            {title}
          </Text>
          {description && (
            <Text variant="caption" color="secondary" style={{ opacity: disabled ? 0.5 : 1 }}>
              {description}
            </Text>
          )}
        </VStack>
        {type === "toggle" && onToggleChange && (
          <Toggle checked={toggleValue ?? false} onChange={onToggleChange} disabled={disabled} size="sm" />
        )}
        {type === "select" && (
          <HStack gap="xs" align="center">
            <Text variant="bodySmall" color="secondary">
              {value}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </HStack>
        )}
        {type === "navigation" && <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />}
      </HStack>
    </View>
  );

  if (type === "toggle") {
    return content;
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
      {content}
    </TouchableOpacity>
  );
}

// =============================================================================
// SETTINGS GROUP COMPONENT
// =============================================================================

interface SettingsGroupProps {
  title?: string;
  children: React.ReactNode;
  footer?: string;
}

function SettingsGroup({ title, children, footer }: SettingsGroupProps) {
  const s = useStyles(styles);

  return (
    <VStack gap="sm" style={s.groupContainer}>
      {title && (
        <Text variant="caption" color="secondary" uppercase style={s.groupTitle}>
          {title}
        </Text>
      )}
      <Card variant="filled" style={s.groupCard}>
        {children}
      </Card>
      {footer && (
        <Text variant="caption" color="tertiary" style={s.groupFooter}>
          {footer}
        </Text>
      )}
    </VStack>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SettingsScreen() {
  const { colors } = useTheme();
  const s = useStyles(styles);
  const settings = useSettingsI18n();
  const { bottomSheet } = useOverlayHelpers();

  const {
    user,
    isAuthenticated,
    display,
    notifications,
    isLoading,
    authLoading,
    themeOptions,
    languageOptions,
    getDisplayValue,
    handleSelectionChange,
    handleLogout,
    handleDeleteAccount,
    updateNotifications,
  } = useSettingsScreen();

  const handleOpenThemeSelection = useCallback(() => {
    bottomSheet(({ close }) => (
      <SelectionModal
        title="Choose Theme"
        options={themeOptions}
        selectedValue={display.theme}
        onSelect={value => {
          handleSelectionChange(value, "theme");
        }}
        onClose={close}
      />
    ));
  }, [bottomSheet, themeOptions, display.theme, handleSelectionChange]);

  const handleOpenLanguageSelection = useCallback(() => {
    bottomSheet(({ close }) => (
      <SelectionModal
        title={settings.display.language.select}
        options={languageOptions}
        selectedValue={display.language}
        onSelect={value => {
          handleSelectionChange(value, "language");
        }}
        onClose={close}
      />
    ));
  }, [bottomSheet, languageOptions, display.language, handleSelectionChange, settings.display.language.select]);

  return (
    <SettingsLayout title={settings.title}>
      {/* User Profile / Sign In CTA */}
      {isAuthenticated ? (
        <UserProfileCard name={user?.name || ""} email={user?.email || ""} />
      ) : (
        <SignInCard
          title={settings.account.signIn}
          description={settings.account.signInDescription}
          onPress={() => router.push("/auth")}
        />
      )}

      {/* Display Settings */}
      <SettingsGroup title={settings.display.title}>
        <SettingsRow
          icon="color-palette-outline"
          title={settings.display.theme.title}
          description={settings.display.theme.description}
          value={getDisplayValue("theme")}
          type="select"
          onPress={handleOpenThemeSelection}
          disabled={isLoading}
        />
        <SettingsRow
          icon="language-outline"
          title={settings.language.title}
          description={settings.language.description}
          value={getDisplayValue("language")}
          type="select"
          onPress={handleOpenLanguageSelection}
          disabled={isLoading}
          isLast
        />
      </SettingsGroup>

      {/* Notification Settings */}
      <SettingsGroup title={settings.notifications.title}>
        <SettingsRow
          icon="notifications-outline"
          title={settings.notifications.title}
          description={settings.notifications.description}
          type="toggle"
          toggleValue={notifications.enabled}
          onToggleChange={value => updateNotifications({ enabled: value })}
          isLast
        />
      </SettingsGroup>

      {/* Account Settings (Logged In Only) */}
      {isAuthenticated && (
        <SettingsGroup title="Account">
          <SettingsRow
            icon="log-out-outline"
            iconColor={colors.text.secondary}
            title="Sign Out"
            description="Sign out of your account"
            type="navigation"
            onPress={handleLogout}
            disabled={authLoading}
          />
          <SettingsRow
            icon="trash-outline"
            iconColor={colors.status.error}
            title="Delete Account"
            description="Permanently delete your account"
            type="navigation"
            onPress={handleDeleteAccount}
            disabled={authLoading}
            destructive
            isLast
          />
        </SettingsGroup>
      )}

      {/* App Version */}
      <VStack gap="sm" align="center" style={s.appInfo}>
        <Text variant="caption" color="tertiary">
          Version 1.0.0
        </Text>
      </VStack>
    </SettingsLayout>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors, { elevation }) => ({
  // Profile Card (Logged In & Logged Out)
  profileCard: {
    marginBottom: tokens.spacing.layout.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    backgroundColor: colors.bg.secondary,
  },
  profileContent: {
    paddingVertical: tokens.spacing.component.md,
    paddingHorizontal: tokens.spacing.component.lg,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  signInAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  profileTextContainer: {
    flex: 1,
  },

  // Settings Group
  groupContainer: {
    marginBottom: tokens.spacing.layout.sm,
  },
  groupTitle: {
    marginLeft: tokens.spacing.component.sm,
    marginBottom: tokens.spacing.component.xs,
    letterSpacing: 0.5,
  },
  groupCard: {
    borderRadius: tokens.radius.lg,
    overflow: "hidden" as const,
    padding: 0,
  },
  groupFooter: {
    marginLeft: tokens.spacing.component.sm,
    marginTop: tokens.spacing.component.xs,
  },

  // Settings Row
  rowContainer: {
    paddingVertical: tokens.spacing.component.md,
    paddingHorizontal: tokens.spacing.component.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.divider,
  },
  rowContent: {
    minHeight: tokens.size.touchTarget.md - tokens.spacing.component.md * 2,
  },
  rowIconContainer: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rowTextContainer: {
    flex: 1,
  },

  // App Info
  appInfo: {
    paddingVertical: tokens.spacing.layout.md,
  },
}));

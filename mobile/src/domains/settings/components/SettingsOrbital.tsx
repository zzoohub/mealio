import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createStyles, useStyles, useTheme } from '@/design-system/theme';
import { Box, Text, HStack, VStack } from '@/design-system/styled';
import { Card } from '@/design-system/styled';
import { tokens } from '@/design-system/tokens';
import { useAuthStore } from '@/domains/auth/stores/authStore';
import { useSettingsStore } from '@/domains/settings/stores/settingsStore';
import { useSettingsI18n } from '@/lib/i18n';

interface SettingsOrbitalProps {
  onNavigate: (section: string) => void;
  isActive: boolean;
}

interface QuickSetting {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onPress: () => void;
}

export default function SettingsOrbital({ onNavigate }: SettingsOrbitalProps) {
  const s = useStyles(styles);
  const { colors } = useTheme();
  const { user, logout } = useAuthStore();
  const isAuthenticated = !!user?.isLoggedIn;
  const { display, notifications } = useSettingsStore();
  const settings = useSettingsI18n();

  const handleSettingsPress = () => {
    router.push('/settings');
  };

  const quickSettings: QuickSetting[] = [
    // Only show Account option for authenticated users
    ...(isAuthenticated
      ? [
          {
            id: 'account',
            title: 'Account',
            icon: 'person-outline' as keyof typeof Ionicons.glyphMap,
            value: user?.username || 'Signed in',
            onPress: () => router.push('/settings/account'),
          },
        ]
      : []),
    {
      id: 'theme',
      title: settings.display.theme.title,
      icon: 'color-palette-outline',
      value:
        display.theme === 'system'
          ? settings.display.theme.system
          : display.theme === 'dark'
          ? settings.display.theme.dark
          : settings.display.theme.light,
      onPress: () => router.push('/settings/display'),
    },
    {
      id: 'notifications',
      title: settings.notifications.title,
      icon: 'notifications-outline',
      value: notifications.enabled ? 'Yes' : 'No',
      onPress: () => router.push('/settings/notifications'),
    },
    {
      id: 'language',
      title: settings.language.title,
      icon: 'language-outline',
      value: display.language === 'ko' ? '한국어' : 'English',
      onPress: () => router.push('/settings/display'),
    },
  ];

  const renderQuickSetting = (setting: QuickSetting) => (
    <Card key={setting.id} variant="filled" style={s.quickSettingCard}>
      <TouchableOpacity
        style={s.quickSettingContent}
        onPress={setting.onPress}
        activeOpacity={0.7}
      >
        <View style={s.quickSettingLeft}>
          <View style={s.quickSettingIcon}>
            <Ionicons
              name={setting.icon}
              size={tokens.size.icon.sm}
              color={colors.interactive.primary}
            />
          </View>
          <Text style={s.quickSettingTitle}>{setting.title}</Text>
        </View>
        <View style={s.quickSettingRight}>
          <Text style={s.quickSettingValue}>{setting.value}</Text>
          <Ionicons
            name="chevron-forward"
            size={tokens.size.icon.xs}
            color={colors.text.secondary}
          />
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => onNavigate('camera')}>
          <Ionicons
            name="arrow-back"
            size={tokens.size.icon.md}
            color={colors.text.primary}
          />
        </TouchableOpacity>

        <Text style={s.headerTitle}>Settings</Text>

        <View style={{ width: tokens.size.icon.md }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Authenticated User Profile OR Sign-in Incentive Banner */}
        {isAuthenticated ? (
          <Card variant="filled" style={s.profileCard}>
            <TouchableOpacity
              style={s.profileContent}
              onPress={() => router.push('/settings/account')}
              activeOpacity={0.7}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={s.profileInfo}>
                <Text style={s.profileName}>
                  {user?.username || 'User'}
                </Text>
                <Text style={s.profileEmail}>
                  {user?.email || 'Signed in'}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={tokens.size.icon.sm}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </Card>
        ) : (
          <Card variant="outline" style={s.signInBanner}>
            <TouchableOpacity
              style={s.signInBannerContent}
              onPress={() => router.push('/auth')}
              activeOpacity={0.7}
            >
              <View style={s.signInBannerLeft}>
                <View style={s.signInIcon}>
                  <Ionicons
                    name="log-in-outline"
                    size={tokens.size.icon.sm}
                    color={colors.interactive.primary}
                  />
                </View>
                <View style={s.signInTextContainer}>
                  <Text style={s.signInTitle}>
                    Sign in to unlock full features
                  </Text>
                  <Text style={s.signInDescription}>
                    Sync your meals across devices and track your progress
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={tokens.size.icon.xs}
                color={colors.interactive.primary}
              />
            </TouchableOpacity>
          </Card>
        )}

        {/* Quick Settings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Settings</Text>
          {quickSettings.map(renderQuickSetting)}
        </View>

        {/* Main Settings Categories */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>All Settings</Text>
          <Card variant="filled" style={s.allSettingsCard}>
            <TouchableOpacity
              style={s.allSettingsContent}
              onPress={handleSettingsPress}
              activeOpacity={0.7}
            >
              <View style={s.allSettingsLeft}>
                <View style={s.allSettingsIcon}>
                  <Ionicons
                    name="settings-outline"
                    size={tokens.size.icon.md}
                    color={colors.interactive.primary}
                  />
                </View>
                <View>
                  <Text style={s.allSettingsTitle}>All Settings</Text>
                  <Text style={s.allSettingsDescription}>
                    Manage all app preferences
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={tokens.size.icon.sm}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </Card>
        </View>

        {/* App Info */}
        <View style={s.appInfo}>
          <Text style={s.appName}>Meal Log</Text>
          <Text style={s.appVersion}>Version 1.0.0</Text>
          <Text style={s.buildInfo}>Build 1</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 60,
    paddingHorizontal: tokens.spacing.component.xl,
    paddingBottom: tokens.spacing.component.lg,
  },
  headerTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.spacing.component.lg,
  },
  profileCard: {
    marginBottom: tokens.spacing.layout.md,
    padding: 0,
  },
  profileContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: tokens.spacing.component.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.interactive.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: tokens.spacing.component.lg,
  },
  avatarText: {
    color: colors.text.inverse,
    fontSize: tokens.typography.fontSize.h3,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.xs,
    color: colors.text.primary,
  },
  profileEmail: {
    fontSize: tokens.typography.fontSize.bodySmall,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: tokens.spacing.layout.lg,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.lg,
    color: colors.text.primary,
  },
  quickSettingCard: {
    marginBottom: tokens.spacing.component.sm,
    padding: 0,
  },
  quickSettingContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: tokens.spacing.component.lg,
  },
  quickSettingLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  quickSettingIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    backgroundColor: colors.interactive.primary + '20',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: tokens.spacing.component.md,
  },
  quickSettingTitle: {
    fontSize: tokens.typography.fontSize.body,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.text.primary,
  },
  quickSettingRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: tokens.spacing.component.sm,
  },
  quickSettingValue: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  allSettingsCard: {
    padding: 0,
  },
  allSettingsContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: tokens.spacing.component.xl,
  },
  allSettingsLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  allSettingsIcon: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: colors.interactive.primary + '20',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: tokens.spacing.component.lg,
  },
  allSettingsTitle: {
    fontSize: tokens.typography.fontSize.h4,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.xs,
    color: colors.text.primary,
  },
  allSettingsDescription: {
    fontSize: tokens.typography.fontSize.bodySmall,
    color: colors.text.secondary,
  },
  appInfo: {
    alignItems: 'center' as const,
    paddingVertical: tokens.spacing.layout.lg,
  },
  appName: {
    fontSize: tokens.typography.fontSize.caption,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: tokens.spacing.component.xs,
    color: colors.text.primary,
  },
  appVersion: {
    fontSize: tokens.typography.fontSize.caption,
    marginBottom: 2,
    color: colors.text.secondary,
  },
  buildInfo: {
    fontSize: tokens.typography.fontSize.caption,
    color: colors.text.tertiary,
  },
  signInBanner: {
    marginBottom: tokens.spacing.layout.md,
    padding: 0,
    borderWidth: 1,
    borderColor: colors.interactive.primary + '20',
    backgroundColor: colors.interactive.primary + '10',
  },
  signInBannerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: tokens.spacing.component.lg,
  },
  signInBannerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  signInIcon: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: tokens.spacing.component.md,
    backgroundColor: colors.interactive.primary + '20',
  },
  signInTextContainer: {
    flex: 1,
  },
  signInTitle: {
    fontSize: tokens.typography.fontSize.bodySmall,
    fontWeight: tokens.typography.fontWeight.semibold,
    marginBottom: 2,
    color: colors.text.primary,
  },
  signInDescription: {
    fontSize: tokens.typography.fontSize.caption,
    lineHeight: tokens.typography.fontSize.caption * tokens.typography.lineHeight.body,
    color: colors.text.secondary,
  },
}));

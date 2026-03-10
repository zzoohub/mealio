import { create } from 'zustand';
import * as Localization from 'expo-localization';
import { STORAGE_KEYS } from '@/shared/config';
import { storage } from '@/shared/lib/storage';
import { captureError } from '@/shared/lib/sentry';
import { track } from '@/shared/lib/analytics';
import { settingsApi } from './settingsApi';
import { isAuthenticated } from '@/shared/lib/auth';
import type { SupportedLanguage } from '@/shared/lib/i18n';

export interface NotificationSettings {
  enabled: boolean;
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  language: SupportedLanguage;
}

export interface CameraSettings {
  quality: 'low' | 'medium' | 'high';
  aiProcessing: boolean;
  autoCapture: boolean;
  flashDefault: 'auto' | 'on' | 'off';
  saveToGallery: boolean;
}

export interface SettingsState {
  notifications: NotificationSettings;
  display: DisplaySettings;
  camera: CameraSettings;
  isLoading: boolean;
  error: string | null;

  // Actions
  updateNotifications: (updates: Partial<NotificationSettings>) => Promise<void>;
  updateDisplay: (updates: Partial<DisplaySettings>) => Promise<void>;
  updateCamera: (updates: Partial<CameraSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  clearError: () => void;
}

const defaultNotifications: NotificationSettings = {
  enabled: true,
};

const defaultDisplay: DisplaySettings = {
  theme: 'dark',
  language: 'en',
};

const defaultCamera: CameraSettings = {
  quality: 'high',
  aiProcessing: true,
  autoCapture: false,
  flashDefault: 'auto',
  saveToGallery: true,
};

export const useSettingsStore = create<SettingsState>()((set, get) => ({
    notifications: defaultNotifications,
    display: defaultDisplay,
    camera: defaultCamera,
    isLoading: false,
    error: null,

    updateNotifications: async (updates: Partial<NotificationSettings>) => {
      const currentState = get();
      const newSettings = { ...currentState.notifications, ...updates };

      set({ notifications: newSettings, error: null });

      for (const [key, value] of Object.entries(updates)) {
        track('settings_changed', {
          setting_category: 'notifications',
          setting_name: key,
          new_value: String(value),
        });
      }

      try {
        await storage.set(STORAGE_KEYS.NOTIFICATION_SETTINGS, newSettings);

        // Sync to API if authenticated (fire-and-forget)
        if (isAuthenticated()) {
          settingsApi.updateSettings({
            notifications_enabled: newSettings.enabled,
          }).catch(() => {});
        }
      } catch (error) {
        set({ notifications: currentState.notifications });
        const errorMessage = error instanceof Error ? error.message : 'Failed to update notifications';
        set({ error: errorMessage });
        throw error;
      }
    },

    updateDisplay: async (updates: Partial<DisplaySettings>) => {
      try {
        set({ isLoading: true, error: null });

        for (const [key, value] of Object.entries(updates)) {
          track('settings_changed', {
            setting_category: 'display',
            setting_name: key,
            new_value: String(value),
          });
        }

        const newSettings = { ...get().display, ...updates };

        await storage.set(STORAGE_KEYS.DISPLAY_SETTINGS, newSettings);

        // Sync to API if authenticated (fire-and-forget)
        if (isAuthenticated()) {
          settingsApi.updateSettings({
            theme: newSettings.theme,
            language: newSettings.language,
          }).catch(() => {});
        }

        set({ display: newSettings, isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update display settings';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    updateCamera: async (updates: Partial<CameraSettings>) => {
      try {
        set({ isLoading: true, error: null });

        for (const [key, value] of Object.entries(updates)) {
          track('settings_changed', {
            setting_category: 'camera',
            setting_name: key,
            new_value: String(value),
          });
        }

        const newSettings = { ...get().camera, ...updates };

        await storage.set(STORAGE_KEYS.CAMERA_SETTINGS, newSettings);

        set({ camera: newSettings, isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update camera settings';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    loadSettings: async () => {
      try {
        set({ isLoading: true, error: null });

        // Load from local storage first
        const settingsData = await storage.getMultiple([
          STORAGE_KEYS.NOTIFICATION_SETTINGS,
          STORAGE_KEYS.DISPLAY_SETTINGS,
          STORAGE_KEYS.CAMERA_SETTINGS,
        ]);

        const updates: Partial<SettingsState> = { isLoading: false };

        const [notificationsItem, displayItem, cameraItem] = settingsData;

        if (notificationsItem?.value) {
          updates.notifications = { ...defaultNotifications, ...notificationsItem.value };
        }
        if (displayItem?.value) {
          updates.display = { ...defaultDisplay, ...displayItem.value };
        } else {
          // No stored display settings — detect device language on first open
          const deviceLocale = Localization.getLocales()[0];
          const detectedLang: SupportedLanguage = deviceLocale?.languageCode === 'ko' ? 'ko' : 'en';
          updates.display = { ...defaultDisplay, language: detectedLang };
        }
        if (cameraItem?.value) {
          updates.camera = { ...defaultCamera, ...cameraItem.value };
        }

        set(updates);

        // If authenticated, also fetch from API and merge
        if (isAuthenticated()) {
          try {
            const apiSettings = await settingsApi.getSettings();
            const merged: Partial<SettingsState> = {};

            if (apiSettings.theme) {
              merged.display = {
                ...get().display,
                theme: apiSettings.theme as DisplaySettings['theme'],
                language: (apiSettings.language || get().display.language) as SupportedLanguage,
              };
            }

            merged.notifications = {
              ...get().notifications,
              enabled: apiSettings.notifications_enabled,
            };

            set(merged);
          } catch {
            // API fetch failed — continue with local settings
          }
        }
      } catch (error) {
        captureError(error, { tags: { feature: "settings", action: "load_settings" } });
        set({ isLoading: false });
      }
    },

    resetToDefaults: async () => {
      try {
        set({ isLoading: true, error: null });

        await storage.removeMultiple([
          STORAGE_KEYS.NOTIFICATION_SETTINGS,
          STORAGE_KEYS.DISPLAY_SETTINGS,
          STORAGE_KEYS.CAMERA_SETTINGS,
        ]);

        set({
          notifications: defaultNotifications,
          display: defaultDisplay,
          camera: defaultCamera,
          isLoading: false,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to reset settings';
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    clearError: () => set({ error: null }),
  }));

export const flushSettingsStorage = () => storage.flush();

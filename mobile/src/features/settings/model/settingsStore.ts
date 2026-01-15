import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/shared/config';
import { storage, createDebouncedSetter } from '@/shared/lib/storage';
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

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector((set, get) => ({
    notifications: defaultNotifications,
    display: defaultDisplay,
    camera: defaultCamera,
    isLoading: false,
    error: null,

    updateNotifications: async (updates: Partial<NotificationSettings>) => {
      const currentState = get();
      const newSettings = { ...currentState.notifications, ...updates };

      set({ notifications: newSettings, error: null });

      try {
        await storage.set(STORAGE_KEYS.NOTIFICATION_SETTINGS, newSettings);
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

        const newSettings = { ...get().display, ...updates };

        await storage.set(STORAGE_KEYS.DISPLAY_SETTINGS, newSettings);

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
        }
        if (cameraItem?.value) {
          updates.camera = { ...defaultCamera, ...cameraItem.value };
        }

        set(updates);
      } catch (error) {
        console.error('Failed to load settings from storage:', error);
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
  }))
);

const debouncedDisplaySave = createDebouncedSetter<DisplaySettings>(STORAGE_KEYS.DISPLAY_SETTINGS);
const debouncedCameraSave = createDebouncedSetter<CameraSettings>(STORAGE_KEYS.CAMERA_SETTINGS);

useSettingsStore.subscribe(
  (state) => state.display,
  (display) => {
    debouncedDisplaySave(display);
  }
);

useSettingsStore.subscribe(
  (state) => state.camera,
  (camera) => {
    debouncedCameraSave(camera);
  }
);

export const flushSettingsStorage = () => storage.flush();

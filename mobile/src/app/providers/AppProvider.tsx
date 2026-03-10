import { ReactNode, useCallback, useEffect, useMemo } from "react";
import { AppState, AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "@/shared/lib/i18n/config";
import { changeLanguage, useCommonI18n } from "@/shared/lib/i18n";
import { useAuthStore } from "@/features/auth/model/authStore";
import { useSettingsStore, flushSettingsStorage } from "@/features/settings/model/settingsStore";
import { ErrorBoundary } from "./error";
import { OverlayProvider, useOverlayHelpers } from "./overlay";
import { queryClient } from "./query";
import { preloadCriticalModules, markPerformance, measurePerformance } from "@/shared/lib/performance";
import { ThemeProvider, type ThemePreference } from "@/shared/ui/theme";
import { useUploadProcessor } from "@/entities/entry";
import { captureError } from "@/shared/lib/sentry";
import { initAnalytics, track, getDaysSinceFirstOpen, flushAnalytics } from "@/shared/lib/analytics";

function AppInitializer() {
  const loadUserFromStorage = useAuthStore(state => state.loadUserFromStorage);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const displayLanguage = useSettingsStore(state => state.display.language);

  useEffect(() => {
    // Track app initialization performance
    markPerformance("app-init");

    // Initialize analytics before anything else
    initAnalytics();

    // Initialize user data and settings from storage on app start
    Promise.all([loadUserFromStorage(), loadSettings()])
      .then(() => {
        const initTime = measurePerformance("app-init");
        if (__DEV__ && initTime && initTime > 1000) {
          console.warn(`Slow app initialization: ${initTime.toFixed(2)}ms`);
        }

        // Track app opened after initialization completes
        track("app_opened", {
          days_since_first_open: getDaysSinceFirstOpen(),
        });
      })
      .catch(error => {
        measurePerformance("app-init");
        captureError(error, { tags: { feature: "app", action: "initialize" } });
      });

    // Preload critical modules for better performance
    preloadCriticalModules();

    // Setup app lifecycle handlers for React Native
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        // Flush pending settings saves and analytics when app goes to background
        flushSettingsStorage();
        flushAnalytics();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [loadUserFromStorage, loadSettings]);

  // Sync language setting with i18n
  useEffect(() => {
    if (displayLanguage) {
      changeLanguage(displayLanguage);
    }
  }, [displayLanguage]);

  return null;
}

function UploadProcessorMount() {
  const { toast } = useOverlayHelpers();
  const common = useCommonI18n();

  const onFailed = useCallback(() => {
    toast({
      title: common.uploadFailed,
      message: common.uploadFailedMessage,
      type: "error",
      position: "top",
      duration: 4000,
    });
  }, [toast, common.uploadFailed, common.uploadFailedMessage]);

  const options = useMemo(() => ({ onFailed }), [onFailed]);

  useUploadProcessor(options);

  return null;
}

export default function AppProvider({ children }: { children: ReactNode }) {
  const themePreference = useSettingsStore(state => state.display.theme);
  const updateDisplay = useSettingsStore(state => state.updateDisplay);

  const handleThemeChange = useCallback(
    (preference: ThemePreference) => {
      updateDisplay({ theme: preference });
    },
    [updateDisplay]
  );

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    captureError(error, {
      tags: { feature: "app", action: "error_boundary" },
      extra: { componentStack: errorInfo.componentStack },
    });
    track("error_boundary_hit", {
      error_message: error.message,
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary onError={handleError}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider
              preference={themePreference}
              onPreferenceChange={handleThemeChange}
            >
              <OverlayProvider>
                <AppInitializer />
                <UploadProcessorMount />
                {children}
              </OverlayProvider>
            </ThemeProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

import { ReactNode, useCallback, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "@/shared/lib/i18n/config";
import { changeLanguage } from "@/shared/lib/i18n";
import { useAuthStore } from "@/features/auth/model/authStore";
import { useSettingsStore, flushSettingsStorage } from "@/features/settings/model/settingsStore";
import { ErrorBoundary } from "./error";
import { OverlayProvider } from "./overlay";
import { queryClient } from "./query";
import { preloadCriticalModules, markPerformance, measurePerformance } from "@/shared/lib/performance";
import { ThemeProvider, type ThemePreference } from "@/shared/ui/design-system/theme";

function AppInitializer() {
  const loadUserFromStorage = useAuthStore(state => state.loadUserFromStorage);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const displayLanguage = useSettingsStore(state => state.display.language);

  useEffect(() => {
    // Track app initialization performance
    markPerformance("app-init");

    // Initialize user data and settings from storage on app start
    Promise.all([loadUserFromStorage(), loadSettings()])
      .then(() => {
        const initTime = measurePerformance("app-init");
        if (__DEV__ && initTime && initTime > 1000) {
          console.warn(`Slow app initialization: ${initTime.toFixed(2)}ms`);
        }
      })
      .catch(error => {
        measurePerformance("app-init");
        console.error("Failed to initialize app data:", error);
      });

    // Preload critical modules for better performance
    preloadCriticalModules();

    // Setup app lifecycle handlers for React Native
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        // Flush pending settings saves when app goes to background
        flushSettingsStorage();
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
    // Log critical errors to crash reporting service
    if (__DEV__) {
      console.error("App-level error:", error, errorInfo);
    } else {
      // In production, use crash reporting service like Crashlytics
      // crashlytics().recordError(error);
    }
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
                {children}
              </OverlayProvider>
            </ThemeProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

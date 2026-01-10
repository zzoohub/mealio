import { useState, useEffect, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { startNavigation, endNavigation } from "@/lib/performance";
import { prefetchBatch } from "@/providers/query";

// =============================================================================
// TYPES (Interface-First Design)
// =============================================================================

export enum OrbitalSection {
  Camera = "camera",
  Analytics = "analytics",
  Settings = "settings",
}

export interface UseOrbitalNavigationReturn {
  // State
  activeSection: OrbitalSection;
  preloadedSections: Set<OrbitalSection>;

  // Navigation
  navigateToSection: (section: OrbitalSection) => void;

  // Helpers
  getCommonProps: () => {
    onNavigate: (section: string) => void;
    isActive: boolean;
  };
}

// =============================================================================
// PRELOAD FUNCTIONS
// =============================================================================

const preloadAnalytics = () => import("@/domains/analytics/components/AnalyticsDashboard");
const preloadSettings = () => import("@/domains/settings/components/SettingsOrbital");

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useOrbitalNavigation(): UseOrbitalNavigationReturn {
  const [activeSection, setActiveSection] = useState<OrbitalSection>(OrbitalSection.Camera);
  const [preloadedSections, setPreloadedSections] = useState<Set<OrbitalSection>>(
    new Set([OrbitalSection.Camera])
  );

  // Preload all sections after initial render
  const preloadAllSections = useCallback(async () => {
    // Small delay to ensure main screen is fully rendered
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      await Promise.all([preloadAnalytics(), preloadSettings()]);
      setPreloadedSections(new Set([OrbitalSection.Camera, OrbitalSection.Analytics, OrbitalSection.Settings]));

      if (__DEV__) {
        console.log("All sections preloaded successfully");
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to preload some sections:", error);
      }
    }
  }, []);

  // Prefetch common data and preload sections on mount
  useEffect(() => {
    const initializeApp = async () => {
      // Start preloading all sections immediately
      preloadAllSections();

      // Prefetch common data that multiple sections might use
      await prefetchBatch([
        {
          key: ["user", "profile"],
          fetcher: async () => {
            const { useAuthStore } = await import("@/domains/auth/stores/authStore");
            return useAuthStore.getState().user;
          },
          staleTime: 1000 * 60 * 10, // 10 minutes
        },
        {
          key: ["settings", "preferences"],
          fetcher: async () => {
            const { useSettingsStore } = await import("@/domains/settings/stores/settingsStore");
            return useSettingsStore.getState();
          },
          staleTime: 1000 * 60 * 15, // 15 minutes
        },
        {
          key: ["meals", "recent", "summary"],
          fetcher: async () => {
            const { mealStorageUtils } = await import("@/domains/diary");
            return mealStorageUtils.getRecentMeals(5);
          },
          staleTime: 1000 * 60 * 5, // 5 minutes
        },
      ]);
    };

    initializeApp();
  }, [preloadAllSections]);

  // Navigate to a section with haptics and performance tracking
  const navigateToSection = useCallback(
    (section: OrbitalSection) => {
      if (section === activeSection) return;

      // Validate section exists
      if (!Object.values(OrbitalSection).includes(section)) {
        console.warn("Invalid section navigation attempted:", section);
        return;
      }

      // Track navigation performance
      startNavigation(activeSection, section);

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.warn("Haptics feedback failed:", error);
      }

      // Instant section change to prevent flickering
      setActiveSection(section);

      // End navigation tracking
      requestAnimationFrame(() => {
        endNavigation(activeSection, section);
      });
    },
    [activeSection]
  );

  // Helper to get common props for sections
  const getCommonProps = useCallback(() => {
    return {
      onNavigate: (section: string) => navigateToSection(section as OrbitalSection),
      isActive: true,
    };
  }, [navigateToSection]);

  return {
    activeSection,
    preloadedSections,
    navigateToSection,
    getCommonProps,
  };
}

import React from "react";
import { useTheme } from "@/design-system/theme";
import { useOrbitalNavigation, OrbitalSection } from "@/hooks";
import { createLazyComponent } from "@/lib/performance";

// Import orbital sections - Camera eagerly loaded as it's the main screen
import CameraCenter from "@/domains/camera/components/Camera";

// Lazy load non-critical components for better performance
const AnalyticsDashboard = createLazyComponent(() => import("@/domains/analytics/components/AnalyticsDashboard"));
const SettingsOrbital = createLazyComponent(() => import("@/domains/settings/components/SettingsOrbital"));

// =============================================================================
// MAIN COMPONENT (Composition Pattern)
// =============================================================================

export default function OrbitalNavigation() {
  // Theme imported for future use
  useTheme();

  const { activeSection, getCommonProps } = useOrbitalNavigation();
  const commonProps = getCommonProps();

  // Render active section
  switch (activeSection) {
    case OrbitalSection.Camera:
      return <CameraCenter {...commonProps} />;
    case OrbitalSection.Analytics:
      return <AnalyticsDashboard {...commonProps} />;
    case OrbitalSection.Settings:
      return <SettingsOrbital {...commonProps} />;
    default:
      return <CameraCenter {...commonProps} />;
  }
}

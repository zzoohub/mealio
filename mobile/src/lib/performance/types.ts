import { ComponentType } from "react";

// Cache types
export interface CacheConfig {
  maxSize: number;
  ttl: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hitCount: number;
}

// Performance monitoring types
export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface NavigationMetric {
  from: string;
  to: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

// Bundle types
export type DomainModules = {
  camera: ComponentType<any>;
  diary: ComponentType<any>;
  settings: ComponentType<any>;
  analytics: ComponentType<any>;
};

// Constants
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  ttl: 5 * 60 * 1000,
};

export const DOMAIN_IMPORT_MAP = {
  camera: () => import("@/domains/camera/components/Camera"),
  diary: () => import("../../../app/diary/index"),
  settings: () => import("@/domains/settings/components/SettingsOrbital"),
  analytics: () => import("@/domains/analytics/components/AnalyticsDashboard"),
} as const;

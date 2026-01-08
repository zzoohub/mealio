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
  meals: ComponentType<any>;
  settings: ComponentType<any>;
  analytics: ComponentType<any>;
};

// Prefetch types
export interface PrefetchQuery {
  key: string[];
  fetcher: () => Promise<any>;
  staleTime?: number;
}

// Constants
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  ttl: 5 * 60 * 1000,
};

export const DOMAIN_IMPORT_MAP = {
  camera: () => import("@/domains/camera/components/Camera"),
  meals: () => import("../../../app/diary-history"),
  settings: () => import("@/domains/settings/components/SettingsOrbital"),
  analytics: () => import("@/domains/analytics/components/AnalyticsDashboard"),
} as const;

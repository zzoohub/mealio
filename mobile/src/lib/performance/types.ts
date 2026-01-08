import { ComponentType } from "react";

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hitCount: number;
}

export interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  averageProcessingTime: number;
  memoryUsage: number;
}

// ============================================================================
// VIRTUALIZATION TYPES
// ============================================================================

export interface VirtualizationConfig {
  threshold: number; // Number of items before virtualization kicks in
  windowSize: number; // Number of items to render
  bufferSize: number; // Number of items to preload
}

// ============================================================================
// QUEUE TYPES
// ============================================================================

export interface ProcessingQueue {
  id: string;
  priority: number;
  task: () => Promise<any>;
  timestamp: number;
}

// ============================================================================
// PERFORMANCE MONITORING TYPES
// ============================================================================

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

// ============================================================================
// BUNDLE TYPES
// ============================================================================

export type DomainModules = {
  camera: ComponentType<any>;
  meals: ComponentType<any>;
  aiCoach: ComponentType<any>;
  settings: ComponentType<any>;
  progress: ComponentType<any>;
};

export type PreloadStrategy = "eager" | "on-demand" | "idle";

// ============================================================================
// PREFETCH TYPES
// ============================================================================

export interface PrefetchQuery {
  key: string[];
  fetcher: () => Promise<any>;
  staleTime?: number;
}

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
};

export const VIRTUALIZATION_CONFIG: VirtualizationConfig = {
  threshold: 100,
  windowSize: 50,
  bufferSize: 10,
};

export const CHUNK_SIZE = 50;
export const DEBOUNCE_DELAY = 300; // ms

// ============================================================================
// DOMAIN IMPORT MAP
// ============================================================================

export const DOMAIN_IMPORT_MAP = {
  camera: () => import("@/domains/camera/components/Camera"),
  meals: () => import("../../../app/meal-history"),
  settings: () => import("@/domains/settings/components/SettingsOrbital"),
  progress: () => import("@/domains/progress/components/ProgressDashboard"),
} as const;

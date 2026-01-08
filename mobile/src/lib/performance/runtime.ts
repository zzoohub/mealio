import type { CacheConfig, CacheEntry, PerformanceMetric, NavigationMetric } from './types';
import { DEFAULT_CACHE_CONFIG } from './types';

// Cache storage
const cache = new Map<string, CacheEntry<any>>();

// Performance monitoring storage
const performanceMetrics = new Map<string, PerformanceMetric>();
const navigationMetrics: NavigationMetric[] = [];

// Cache functions
function isCacheEntryValid(entry: CacheEntry<any>, ttl: number): boolean {
  return Date.now() - entry.timestamp < ttl;
}

export async function getCachedData<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  config: Partial<CacheConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
  const cachedEntry = cache.get(key);

  if (cachedEntry && isCacheEntryValid(cachedEntry, finalConfig.ttl)) {
    cachedEntry.hitCount++;
    return cachedEntry.data as T;
  }

  try {
    const data = await fetchFunction();

    if (cache.size >= finalConfig.maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
      hitCount: 0,
    });

    return data;
  } catch (error) {
    if (cachedEntry) {
      return cachedEntry.data as T;
    }
    throw error;
  }
}

// Performance monitoring
export function markPerformance(name: string, metadata?: Record<string, any>): void {
  performanceMetrics.set(name, {
    name,
    startTime: performance.now(),
    metadata: metadata || {},
  });
}

export function measurePerformance(name: string): number | undefined {
  const metric = performanceMetrics.get(name);
  if (!metric) return undefined;

  const endTime = performance.now();
  const duration = endTime - metric.startTime;

  metric.endTime = endTime;
  metric.duration = duration;

  if (__DEV__) {
    console.log(`⏱ ${name}: ${duration.toFixed(2)}ms`);
  }

  return duration;
}

export function startNavigation(from: string, to: string): void {
  navigationMetrics.push({
    from,
    to,
    startTime: performance.now(),
  });
}

export function endNavigation(from: string, to: string): void {
  const metric = navigationMetrics.find(
    m => m.from === from && m.to === to && !m.endTime
  );

  if (metric) {
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (__DEV__) {
      console.log(`📍 Navigation ${from} → ${to}: ${metric.duration.toFixed(2)}ms`);
    }
  }
}

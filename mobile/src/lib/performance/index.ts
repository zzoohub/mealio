// Query client
export { queryClient, prefetchBatch } from './query';

// Runtime: cache & monitoring
export {
  getCachedData,
  markPerformance,
  measurePerformance,
  startNavigation,
  endNavigation,
} from './runtime';

// Bundling: lazy loading
export { preloadCriticalModules, createLazyComponent } from './bundling';

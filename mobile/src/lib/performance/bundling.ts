import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import type { DomainModules, PreloadStrategy } from './types';
import { DOMAIN_IMPORT_MAP } from './types';

// ============================================================================
// BUNDLE MANAGEMENT
// ============================================================================

const loadedModules = new Set<string>();
const preloadPromises = new Map<string, Promise<any>>();

function getDomainImportFunction<K extends keyof DomainModules>(
  domain: K
): () => Promise<{ default: DomainModules[K] }> {
  return DOMAIN_IMPORT_MAP[domain] as () => Promise<{ default: DomainModules[K] }>;
}

async function scheduleIdlePreload(
  importFn: () => Promise<any>,
  domain: string
): Promise<void> {
  return new Promise((resolve) => {
    const callback = () => {
      if (!loadedModules.has(domain)) {
        preloadComponent(importFn);
        loadedModules.add(domain);
      }
      resolve();
    };

    if ('requestIdleCallback' in globalThis) {
      (globalThis as any).requestIdleCallback(callback, { timeout: 2000 });
    } else {
      setTimeout(callback, 100);
    }
  });
}

export async function importDomain<K extends keyof DomainModules>(
  domain: K, 
  strategy: PreloadStrategy = 'on-demand'
): Promise<() => Promise<{ default: DomainModules[K] }>> {
  const importFn = getDomainImportFunction(domain);
  
  if (strategy === 'eager' && !loadedModules.has(domain)) {
    preloadComponent(importFn);
    loadedModules.add(domain);
  } else if (strategy === 'idle' && !preloadPromises.has(domain)) {
    preloadPromises.set(domain, scheduleIdlePreload(importFn, domain));
  }

  return importFn;
}

export function preloadCriticalModules(): void {
  importDomain('camera', 'eager');
  importDomain('analytics', 'idle');
}

export function getLoadedModulesCount(): number {
  return loadedModules.size;
}

export function isModuleLoaded(domain: keyof DomainModules): boolean {
  return loadedModules.has(domain);
}

export const importDomainMap = DOMAIN_IMPORT_MAP;

// ============================================================================
// LAZY LOADING UTILITIES
// ============================================================================

/**
 * Default loading component
 */
const DefaultLoadingComponent: ComponentType = () => React.createElement(
  View,
  { style: styles.loadingContainer },
  React.createElement(ActivityIndicator, { size: 'large', color: '#FF6B35' })
);

/**
 * Lazy loading wrapper with loading fallback
 */
export function withLazy<P extends object>(
  Component: LazyExoticComponent<ComponentType<P>>,
  LoadingComponent?: ComponentType
): ComponentType<P> {
  return function LazyComponent(props: P) {
    const FallbackComponent = LoadingComponent || DefaultLoadingComponent;
    
    return React.createElement(
      Suspense,
      { fallback: React.createElement(FallbackComponent) },
      React.createElement(Component, props)
    );
  };
}

/**
 * Create lazy component with error boundary
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  LoadingComponent?: ComponentType
): ComponentType<P> {
  const LazyComponent = React.lazy(importFn);
  return withLazy(LazyComponent, LoadingComponent);
}

/**
 * Preload a lazy component for better UX
 */
export function preloadComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>
): void {
  // Start loading the component in the background
  importFn().catch(error => {
    if (__DEV__) {
      console.warn('Failed to preload component:', error);
    }
  });
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
});
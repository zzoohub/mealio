import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { DOMAIN_IMPORT_MAP } from './types';

// Track loaded modules
const loadedModules = new Set<string>();

// Preload critical modules on app start
export function preloadCriticalModules(): void {
  // Preload camera eagerly
  if (!loadedModules.has('camera')) {
    DOMAIN_IMPORT_MAP.camera().catch(() => {});
    loadedModules.add('camera');
  }
}

// Default loading component
const LoadingFallback: ComponentType = () => React.createElement(
  View,
  { style: styles.loadingContainer },
  React.createElement(ActivityIndicator, { size: 'large', color: '#FF6B35' })
);

// Create lazy component with Suspense wrapper
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  LoadingComponent?: ComponentType
): ComponentType<P> {
  const LazyComponent = React.lazy(importFn);
  const Fallback = LoadingComponent || LoadingFallback;

  return function WrappedLazyComponent(props: P) {
    return React.createElement(
      Suspense,
      { fallback: React.createElement(Fallback) },
      React.createElement(LazyComponent, props)
    );
  };
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
});

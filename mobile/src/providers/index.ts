/**
 * Container Layer
 *
 * 앱 전체를 감싸는 인프라 레이어
 * - Providers (Query, Theme, Overlay, I18n)
 * - Error Boundary
 * - App Initialization
 */

// Main App Provider
export { default as AppProvider } from "./AppProvider";

// Overlay System
export { OverlayProvider, useOverlay, useOverlayController, useOverlayHelpers } from "./overlay";
export type { ToastOptions, ConfirmOptions, ToastType, ToastPosition } from "./overlay";

// Query Client
export { queryClient, prefetchData, prefetchBatch } from "./query";
export type { PrefetchQuery } from "./query";

// Error Boundary
export { ErrorBoundary } from "./error";

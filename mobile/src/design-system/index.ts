/**
 * Mealio Design System
 *
 * A composable design system built on the headless component pattern.
 *
 * Architecture:
 * - headless/  - Behavior + accessibility hooks (no styling)
 * - styled/    - Styled components using headless hooks + tokens
 * - tokens/    - Design tokens (colors, spacing, typography)
 * - theme/     - Theme provider and hooks for light/dark mode
 *
 * @example
 * ```tsx
 * // Import headless hooks for custom implementations
 * import { useButton, useInput } from '@/design-system/headless';
 *
 * // Or use pre-styled components (when available)
 * import { Button, Input } from '@/design-system/styled';
 *
 * // Use theme for colors
 * import { useTheme, useThemedStyles, ThemeProvider } from '@/design-system/theme';
 * ```
 */

// Headless hooks - behavior and accessibility without styling
export * from './headless';

// Theme system - light/dark mode support
export * from './theme';

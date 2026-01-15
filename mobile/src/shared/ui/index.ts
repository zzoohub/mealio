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
 * import { useButton, useInput } from '@/shared/ui/headless';
 *
 * // Or use pre-styled components (when available)
 * import { Button, Input } from '@/shared/ui/styled';
 *
 * // Use theme for colors
 * import { useTheme, useThemedStyles, ThemeProvider } from '@/shared/ui/theme';
 * ```
 */

// Headless hooks - behavior and accessibility without styling
export * from './headless';

// Theme system - light/dark mode support
export * from './theme';

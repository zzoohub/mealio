---
name: design-system
description: Design token systems, component architecture, and dark mode implementation. Covers spacing, color, typography scales, component API patterns, and accessibility. Use when building design systems or establishing visual consistency.
---

# Design System

## 1. Design Token System

### Token Hierarchy

```
Global Tokens (primitive)
└── Semantic Tokens (purpose)
    └── Component Tokens (specific)

Example:
--color-blue-500          (global)
└── --color-primary       (semantic)
    └── --button-bg       (component)
```

### Spacing Scale (4px base)

```css
:root {
  --spacing-0: 0;
  --spacing-1: 4px;    /* Inline gaps */
  --spacing-2: 8px;    /* Tight padding */
  --spacing-3: 12px;   /* Default padding */
  --spacing-4: 16px;   /* Card padding */
  --spacing-6: 24px;   /* Component separation */
  --spacing-8: 32px;   /* Section separation */
  --spacing-12: 48px;  /* Large gaps */
  --spacing-16: 64px;  /* Page sections */
}
```

### Typography Scale (1.25 ratio)

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Fira Code', 'Consolas', monospace;

  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.25rem;    /* 20px */
  --text-xl: 1.5rem;     /* 24px */
  --text-2xl: 2rem;      /* 32px */
  --text-3xl: 2.5rem;    /* 40px */
  --text-4xl: 3rem;      /* 48px */

  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### Color System

```css
:root {
  /* Primitives (don't use directly) */
  --color-gray-50: #fafafa;
  --color-gray-100: #f5f5f5;
  --color-gray-200: #e5e5e5;
  --color-gray-300: #d4d4d4;
  --color-gray-400: #a3a3a3;
  --color-gray-500: #737373;
  --color-gray-600: #525252;
  --color-gray-700: #404040;
  --color-gray-800: #262626;
  --color-gray-900: #171717;

  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;
  --color-red-500: #ef4444;
  --color-green-500: #22c55e;

  /* Semantic Tokens (use these) */
  --color-bg-primary: var(--color-gray-50);
  --color-bg-secondary: var(--color-gray-100);
  --color-bg-tertiary: var(--color-gray-200);
  --color-bg-inverse: var(--color-gray-900);

  --color-text-primary: var(--color-gray-900);
  --color-text-secondary: var(--color-gray-600);
  --color-text-tertiary: var(--color-gray-500);
  --color-text-inverse: var(--color-gray-50);

  --color-border-default: var(--color-gray-200);
  --color-border-strong: var(--color-gray-300);

  --color-interactive: var(--color-blue-500);
  --color-interactive-hover: var(--color-blue-600);
  --color-interactive-active: var(--color-blue-700);

  --color-success: var(--color-green-500);
  --color-error: var(--color-red-500);
  --color-warning: #f59e0b;
}
```

### Elevation & Radius

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}
```

### Motion Tokens

```css
:root {
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;

  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
  }
}
```

---

## 2. Dark Mode

### CSS Custom Properties

```css
:root {
  --color-bg-primary: var(--color-gray-50);
  --color-text-primary: var(--color-gray-900);
  --color-border-default: var(--color-gray-200);
}

[data-theme="dark"] {
  --color-bg-primary: var(--color-gray-900);
  --color-text-primary: var(--color-gray-50);
  --color-border-default: var(--color-gray-700);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg-primary: var(--color-gray-900);
    --color-text-primary: var(--color-gray-50);
    --color-border-default: var(--color-gray-700);
  }
}
```

### Theme Provider

```tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: 'light' | 'dark';
} | null>(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const value = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    
    root.setAttribute('data-theme', value);
    setResolved(value);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be within ThemeProvider');
  return ctx;
};
```

### Prevent Flash (Next.js)

```tsx
// app/layout.tsx
<head>
  <script dangerouslySetInnerHTML={{
    __html: `
      (function() {
        const theme = localStorage.getItem('theme') || 'system';
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
        document.documentElement.setAttribute('data-theme', resolved);
      })();
    `,
  }} />
</head>
```

---

## 3. Component Architecture

### Component Categories

| Category | Examples |
|----------|----------|
| Primitives | Box, Text, Icon |
| Forms | Button, Input, Select, Checkbox |
| Layout | Stack, Grid, Container |
| Data Display | Card, Badge, Avatar, Table |
| Feedback | Spinner, Skeleton, Progress |
| Overlay | Modal, Popover, Tooltip, Drawer |

### API Design Principles

```tsx
// ❌ Boolean props
<Button primary large outline>

// ✅ Variant props
<Button variant="primary" size="lg" appearance="outline">

// Standard conventions
size: 'sm' | 'md' | 'lg'
variant: 'primary' | 'secondary' | 'ghost'
disabled: boolean
fullWidth: boolean
```

### Compound Components

```tsx
<Card>
  <Card.Header><Card.Title>Title</Card.Title></Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>

<Select>
  <Select.Trigger placeholder="Select" />
  <Select.Content>
    <Select.Item value="1">Option 1</Select.Item>
  </Select.Content>
</Select>
```

### Button Example (with CVA)

```tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva('btn', {
  variants: {
    variant: { primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost' },
    size: { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, isLoading, disabled, children, className, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
);
```

### Component States

| State | Selector | Must Handle |
|-------|----------|-------------|
| Default | - | ✅ |
| Hover | `:hover` | ✅ |
| Focus | `:focus-visible` | ✅ |
| Active | `:active` | ✅ |
| Disabled | `:disabled` | ✅ |

---

## 4. Accessibility

### Focus Management

```css
:focus-visible {
  outline: 2px solid var(--color-interactive);
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

### Color Contrast

| Element | Min Ratio |
|---------|-----------|
| Normal text | 4.5:1 |
| Large text (18px+ bold) | 3:1 |
| UI components | 3:1 |

### Touch Targets

```css
.interactive {
  min-width: 44px;
  min-height: 44px;
}
```

### ARIA Patterns

```tsx
// Loading button
<button aria-busy={isLoading} aria-disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</button>

// Icon button
<button aria-label="Close dialog">
  <CloseIcon aria-hidden="true" />
</button>

// Form error
<input aria-invalid={hasError} aria-describedby="error-msg" />
<span id="error-msg" role="alert">{error}</span>
```

---

## 5. File Structure

```
design-system/
├── tokens/
│   ├── colors.css
│   ├── spacing.css
│   ├── typography.css
│   └── index.css
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.module.css
│   │   └── index.ts
│   ├── Input/
│   ├── Card/
│   └── index.ts
├── contexts/
│   └── ThemeContext.tsx
└── index.ts
```
